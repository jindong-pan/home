import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Minus, Plus, Unlock, Lock, BarChart2, Volume2, Maximize2, Minimize2, Trash2, Download, Copy } from 'lucide-react';

// ======================================================================================
// 1. Helper Functions and Constants
// ======================================================================================

// The correct password as specified by the user (密碼)
const CORRECT_PASSWORD = '201314';

/**
 * Helper to calculate Root Mean Square (RMS) from time-domain audio data.
 * RMS is used as a simple proxy for loudness/amplitude.
 * @param {Float32Array} data - Time domain data from AnalyserNode.
 * @returns {number} - Scaled RMS value (0 to ~50-100 in typical mic use).
 */
const calculateRMS = (data) => {
  let sumOfSquares = 0;
  for (const amplitude of data) {
    sumOfSquares += amplitude * amplitude;
  }
  // RMS is the square root of the mean of the squares.
  // We scale it by a factor (e.g., 200) to get a more visible range for the user's defined threshold (15).
  const rms = Math.sqrt(sumOfSquares / data.length) * 200;
  // Cap at 100 for normalization purposes
  return Math.min(rms, 100);
};

/**
 * Formats the current date as MM/DD (格式化日期為 MM/DD).
 * @returns {string}
 */
const getFormattedDate = () => {
  const now = new Date();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  return `${month}/${day}`;
};

/**
 * Component for Increment/Decrement buttons (控制按鈕).
 */
const ControlButton = ({ icon: Icon, onClick, label, disabled = false, className = '' }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    className={`p-2 m-1 bg-gray-700 hover:bg-green-600 disabled:opacity-50 transition duration-150 rounded-full shadow-lg text-white/90 ${className}`}
  >
    <Icon className="w-5 h-5" />
  </button>
);

/**
 * Converts a list of noise records (JSON objects) into a CSV string (轉換為 CSV 格式).
 * @param {Array<{ id: number, time: string, level: number }>} data - The noise records.
 * @returns {string} - The CSV formatted string.
 */
const convertToCSV = (data) => {
  if (data.length === 0) return 'ID,日期/時間,噪音水平(RMS)\n';
  
  // Define CSV Header (CSV 標頭)
  const headers = ['ID', '日期/時間', '噪音水平(RMS)'];
  const csvRows = [headers.join(',')]; // Start with the header row

  // Map each record to a CSV row (映射數據到 CSV 行)
  data.forEach(record => {
    // Convert timestamp to a human-readable date/time string for better CSV usability
    const fullDateTime = new Date(record.id).toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false // Use 24-hour format
    });
    
    // Quote the date/time string
    const row = [
        record.id, 
        `"${fullDateTime}"`, 
        record.level.toFixed(2)
    ];
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
};


// ======================================================================================
// 1.5. DownloadControls Component (數據輸出控制)
// ======================================================================================

const DownloadControls = ({ records, recordCount }) => {
    const [copyStatus, setCopyStatus] = useState('');

    // Memoize the CSV content calculation to only re-run when records change
    const csvContent = useMemo(() => convertToCSV(records), [records]);

    const handleCopy = useCallback(() => {
        if (recordCount === 0) {
            setCopyStatus('無數據可複製');
            setTimeout(() => setCopyStatus(''), 2000);
            return;
        }

        try {
            // Use Clipboard API for modern browsers
            navigator.clipboard.writeText(csvContent);
            setCopyStatus('數據已複製到剪貼簿！');
        } catch (err) {
            // Fallback for older browsers (由於 iFrame 限制，此處可能需要更強大的回退，但我們先嘗試標準 API)
            console.error('無法使用 Clipboard API 複製:', err);
            setCopyStatus('複製失敗，請手動選取');
        } finally {
            setTimeout(() => setCopyStatus(''), 3000);
        }
    }, [csvContent, recordCount]);

    const handleDownload = useCallback(() => {
        if (recordCount === 0) {
            // 使用自定義訊息代替 alert()
            setCopyStatus('無數據可下載。');
            setTimeout(() => setCopyStatus(''), 3000);
            return;
        }
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        // Use a descriptive filename including the current date
        const dateString = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
        link.setAttribute('download', `Noise_Monitor_Records_${dateString}.csv`);
        
        // Append to body, click, and remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [csvContent, recordCount]);

    return (
        <div className="p-4 bg-gray-800 rounded-xl shadow-lg border border-gray-700 mt-4">
            <h2 className="text-xl font-bold text-gray-300 mb-4 border-b border-gray-700 pb-2 flex items-center">
                <Download className="w-5 h-5 mr-2 text-green-400" />
                歷史數據輸出 ({recordCount} 筆記錄)
            </h2>
            <div className="flex flex-wrap gap-4 justify-start">
                <button
                    onClick={handleCopy}
                    disabled={recordCount === 0}
                    className="flex items-center px-4 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-600 text-white rounded-lg shadow-md transition duration-200 disabled:opacity-50 min-w-[120px]"
                >
                    <Copy className="w-4 h-4 mr-2" />
                    複製 CSV 數據
                </button>
                <button
                    onClick={handleDownload}
                    disabled={recordCount === 0}
                    className="flex items-center px-4 py-2 text-sm font-semibold bg-purple-700 hover:bg-purple-600 text-white rounded-lg shadow-md transition duration-200 disabled:opacity-50 min-w-[120px]"
                >
                    <Download className="w-4 h-4 mr-2" />
                    下載 CSV 檔案
                </button>
            </div>
            {(copyStatus || recordCount === 0) && (
                <p className={`mt-3 text-sm font-medium ${copyStatus.includes('成功') ? 'text-green-400' : 'text-yellow-400'} ${recordCount === 0 && 'text-red-400'}`}>
                    {copyStatus || '尚無數據可供輸出。'}
                </p>
            )}
            
            {/* 可複製的文字區塊 (提供給舊版瀏覽器或手動檢查) */}
            <div className="mt-4">
                <textarea
                    readOnly
                    value={csvContent}
                    placeholder="歷史數據將以 CSV 格式顯示在這裡..."
                    rows={6}
                    className="w-full p-2 text-sm bg-gray-900 text-gray-300 rounded-lg border border-gray-700 font-mono resize-none"
                />
            </div>
        </div>
    );
};


// ======================================================================================
// 2. Auth Screen Component (驗證畫面)
// ======================================================================================

const AuthScreen = ({ onAuthenticate }) => {
  const [password, setPassword] = useState('');
  const [attemptCount, setAttemptCount] = useState(0);
  // Initial message is neutral
  const [message, setMessage] = useState('請輸入密碼以進入噪音監測準備階段');
  const [isLocked, setIsLocked] = useState(false);

  const handleLogin = () => {
    if (isLocked) return;

    const currentPassword = password; // Capture current password before clearing
    setPassword(''); // Clear password immediately

    const newAttemptCount = attemptCount + 1;
    setAttemptCount(newAttemptCount);

    // The first two attempts always show an error message, regardless of password.
    if (newAttemptCount <= 2) {
      // FIX: Only show "密碼錯誤" without explanation
      setMessage('密碼錯誤');
      return;
    }

    // From the third attempt, perform actual verification.
    if (currentPassword === CORRECT_PASSWORD) {
      setMessage('驗證成功！進入監測模式...');
      setIsLocked(true); // Lock further attempts temporarily
      setTimeout(() => onAuthenticate(true), 1500);
    } else {
      setMessage('密碼錯誤');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 min-h-screen">
      <div className="bg-gray-800 p-8 md:p-12 rounded-xl shadow-2xl w-full max-w-sm border border-green-600/30">
        <h1 className="text-3xl font-bold text-green-400 mb-6 flex items-center justify-center">
          <Lock className="w-6 h-6 mr-3" />
          系統存取驗證
        </h1>
        
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="請輸入密碼..."
          disabled={isLocked}
          className="w-full p-3 mb-4 text-lg bg-gray-700 text-white rounded-lg border border-gray-600 focus:ring-green-500 focus:border-green-500 transition duration-200"
        />

        <button
          onClick={handleLogin}
          disabled={isLocked}
          className="w-full p-3 text-lg font-semibold bg-green-700 hover:bg-green-600 text-white rounded-lg shadow-md transition duration-200 disabled:opacity-50"
        >
          {isLocked ? '已驗證' : `登入 (嘗試: ${attemptCount})`}
        </button>

        <p className={`mt-4 text-center font-medium ${message.includes('成功') ? 'text-green-400' : 'text-red-400'}`}>
          {message}
        </p>
      </div>
    </div>
  );
};

// ======================================================================================
// 3. Main Monitor Component (主要監測組件)
// ======================================================================================

const NoiseMonitor = () => {
  // --- State for Settings and Data ---
  const [threshold, setThreshold] = useState(15);
  const [yAxisMax, setYAxisMax] = useState(50);
  const [recordLimit, setRecordLimit] = useState(100); // 0 means unlimited (0 為無限)
  const [noiseRecords, setNoiseRecords] = useState([]); // [{ id: timestamp, time: 'MM/DD', level: number }]
  const [isSampling, setIsSampling] = useState(false); // Green light indicator (綠燈指示器)
  const [error, setError] = useState(null);
  
  // State to track if the async audio setup is complete (音頻系統是否就緒)
  const [isAudioReady, setIsAudioReady] = useState(false);

  // --- Refs for Web Audio API and Real-Time Data (Refs 用於避免閉包問題) ---
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const maxLevelLastSecondRef = useRef(0);
  
  // Ref to keep track of current records for the reporting interval
  const noiseRecordsRef = useRef(noiseRecords); 

  useEffect(() => {
    // Keep ref updated with state for logic inside intervals
    noiseRecordsRef.current = noiseRecords;
  }, [noiseRecords]);

  // --- Web Audio Setup (Runs once) ---
  useEffect(() => {
    const setupAudio = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('您的瀏覽器不支持麥克風訪問 (getUserMedia)。');
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const context = new AudioContext();
        audioContextRef.current = context;

        const analyser = context.createAnalyser();
        // Set FFT size to 2048, buffer length will be 1024. 
        analyser.fftSize = 2048; 
        analyserRef.current = analyser;

        const source = context.createMediaStreamSource(stream);
        source.connect(analyser); // Connect source to analyser

        setIsAudioReady(true); // Audio is ready, allow intervals to start

        console.log("Web Audio API 設定成功。");
      } catch (err) {
        console.error('麥克風設定錯誤:', err);
        setError(`麥克風訪問錯誤: ${err.message}`);
      }
    };

    setupAudio();

    // Cleanup function
    return () => {
      console.log("Cleaning up audio stream...");
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(e => console.error("Error closing AudioContext:", e));
      }
    };
  }, []);

  // --- Core Logic: Sampling and Reporting (核心採樣與報告邏輯) ---

  /**
   * Performs the immediate RMS measurement and updates the maximum for the current second.
   */
  const measureAndRecordMax = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    // Use Float32Array to get the time-domain data (buffer size is fftSize/2)
    const bufferLength = analyser.frequencyBinCount; // 1024 for fftSize 2048
    const dataArray = new Float32Array(bufferLength);
    analyser.getFloatTimeDomainData(dataArray);

    const currentRms = calculateRMS(dataArray);

    // Update the maximum level observed in the current 1-second window
    maxLevelLastSecondRef.current = Math.max(maxLevelLastSecondRef.current, currentRms);

  }, []);

  /**
   * Runs the 1-second reporting cycle: checks max level against threshold, stores, and manages limit.
   */
  const runReportStep = useCallback(() => {
    const maxLevel = maxLevelLastSecondRef.current;
    const currentThreshold = threshold;
    const currentRecordLimit = recordLimit;

    if (maxLevel > currentThreshold) {
      const newRecord = {
        id: Date.now(),
        time: getFormattedDate(),
        level: parseFloat(maxLevel.toFixed(2)),
      };

      setNoiseRecords(prevRecords => {
        let newRecords = [...prevRecords, newRecord];

        // Discard minimum if limit is exceeded (and limit is not 0)
        if (currentRecordLimit > 0 && newRecords.length > currentRecordLimit) {
          // Find the record with the smallest level (找到最小的記錄並丟棄)
          let minLevel = Infinity;
          let minIndex = -1;
          
          // Must find the index of the minimum level to discard it
          newRecords.forEach((record, index) => {
            if (record.level < minLevel) {
              minLevel = record.level;
              minIndex = index;
            }
          });

          if (minIndex !== -1) {
            newRecords.splice(minIndex, 1); // Discard the minimum value
          }
        }

        return newRecords;
      });
    }

    // Reset the max level for the next second (重置本秒最大值)
    maxLevelLastSecondRef.current = 0;
  }, [threshold, recordLimit]);

  // --- Timer Setup (200ms Sampling Loop, 1000ms Reporting Loop) ---
  useEffect(() => {
    // Wait for both no error AND audio ready flag
    if (error || !isAudioReady) {
        console.log("Waiting for audio setup to complete before starting intervals...");
        return;
    }

    console.log("Audio is ready. Starting sampling and reporting intervals.");

    // 1. Sampling Loop (Every 200ms)
    const sampleInterval = setInterval(() => {
      // 1. Light ON
      setIsSampling(true);

      // 2. Perform the measurement immediately
      measureAndRecordMax();

      // 3. Light OFF after 100ms (to meet the 0.1s duration requirement)
      // This timeout creates the required 100ms flash duration.
      setTimeout(() => {
        setIsSampling(false);
      }, 100);
    }, 200);

    // 2. Reporting Loop (Every 1000ms)
    const reportInterval = setInterval(runReportStep, 1000);

    // Clean up
    return () => {
      clearInterval(sampleInterval);
      clearInterval(reportInterval);
      console.log("Intervals cleaned up.");
    };
  }, [error, isAudioReady, measureAndRecordMax, runReportStep]); // Dependency added: isAudioReady


  // --- Chart Drawing Logic (圖表繪製邏輯) ---

  // Sort records by ID (time) for plotting and calculate scaling
  const sortedRecords = useMemo(() => {
    // Sort by ID (time) ascendingly
    return [...noiseRecords].sort((a, b) => a.id - b.id);
  }, [noiseRecords]);

  const Chart = ({ data }) => {
    const width = 800;
    const height = 250;
    const padding = 30;
    const innerWidth = width - 2 * padding;
    const innerHeight = height - 2 * padding;

    // The Y-axis should range from 'threshold' to 'yAxisMax'
    const yRange = yAxisMax - threshold;

    if (yRange <= 0) {
        return (
             <div className="flex items-center justify-center h-full text-red-500">
                縱座標最大值 ({yAxisMax}) 必須大於閥值 ({threshold})。
            </div>
        );
    }
    
    if (data.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <BarChart2 className="w-6 h-6 mb-2" />
          無噪音事件記錄 (等待事件超過閥值 {threshold})
        </div>
      );
    }

    // X-axis: Time (using index for proportional spacing)
    const xStep = innerWidth / (data.length - 1 || 1);

    // Y-scaling function
    const getY = (level) => {
      // Normalize level within the range [threshold, yAxisMax]
      const normalized = Math.max(0, level - threshold); // Values below threshold are 0
      const scale = normalized / yRange;
      // Convert to SVG coordinate system (0 is top)
      return innerHeight - scale * innerHeight;
    };

    // Generate scatter plot points (Circles)
    const circles = data.map((record, index) => (
      <circle
        key={record.id}
        cx={padding + index * xStep}
        // Ensure point is visible even if level is slightly below threshold (or at the bottom)
        cy={padding + Math.min(innerHeight, Math.max(0, getY(record.level)))} 
        r={5} // Dot size
        fill={record.level >= yAxisMax ? 'rgb(255, 69, 0)' : 'rgb(52, 211, 163)'} // Orange/Red for high values, bright green otherwise
        className="transition-all duration-500 ease-out"
        title={`時間: ${new Date(record.id).toLocaleString()}, 分貝: ${record.level}`}
      />
    ));

    // Y-Axis Labels
    const yTicks = [
      yAxisMax,
      threshold + yRange * 0.75,
      threshold + yRange * 0.5,
      threshold + yRange * 0.25,
      threshold, // Min value is the threshold
    ];

    const yLabels = yTicks.map((tickValue, index) => (
      <g key={index}>
        {/* Horizontal grid line */}
        <line
          x1={padding}
          y1={padding + getY(tickValue)}
          x2={width - padding}
          y2={padding + getY(tickValue)}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeDasharray={tickValue === threshold || tickValue === yAxisMax ? 0 : 4}
        />
        {/* Text label */}
        <text
          x={padding - 5}
          y={padding + getY(tickValue) + 5}
          textAnchor="end"
          fill="rgba(255, 255, 255, 0.7)"
          fontSize="12"
        >
          {Math.round(tickValue)}
        </text>
      </g>
    ));

    // X-Axis Labels (Time of the earliest and latest record)
    const firstTime = data[0].time;
    const lastTime = data[data.length - 1].time;

    return (
      <div className="overflow-x-auto w-full">
        <svg viewBox={`0 0 ${width} ${height + padding}`} width="100%" height={height + padding} preserveAspectRatio="xMinYMin meet">
          <g transform={`translate(0, ${padding/2})`}>
             {yLabels}

            {/* X-Axis Line */}
            <line
              x1={padding}
              y1={padding + innerHeight}
              x2={width - padding}
              y2={padding + innerHeight}
              stroke="rgba(255, 255, 255, 0.7)"
            />

            {/* X-Axis Time Labels */}
            <text x={padding} y={height + 5} fill="rgba(255, 255, 255, 0.7)" fontSize="12" textAnchor="start">
              {data.length > 0 ? firstTime : ''}
            </text>
            <text x={width - padding} y={height + 5} fill="rgba(255, 255, 255, 0.7)" fontSize="12" textAnchor="end">
              {data.length > 0 ? lastTime : ''} ({data.length} 紀錄點)
            </text>

            {circles}
          </g>
        </svg>
      </div>
    );
  };


  // --- UI Layout and Controls ---
  return (
    <div className="flex flex-col h-full w-full p-4 bg-gray-900 text-white font-inter rounded-xl shadow-2xl overflow-y-auto">
      <h1 className="text-3xl font-extrabold text-green-400 mb-6 flex items-center border-b border-gray-700 pb-3">
        <Volume2 className="w-7 h-7 mr-3" />
        夜間環境噪音監測儀
      </h1>

      {error && (
        <div className="p-4 mb-4 bg-red-800 text-red-200 rounded-lg shadow-md">
          {error}
        </div>
      )}
      
      {!isAudioReady && !error && (
         <div className="p-4 mb-4 bg-blue-900 text-blue-200 rounded-lg shadow-md">
            正在請求麥克風權限並初始化音頻系統...
        </div>
      )}

      {/* Sampling Status and Current Data Display */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Status Indicator */}
        <div className="flex-1 bg-gray-800 p-4 rounded-xl shadow-inner border border-gray-700">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-300">採樣狀態 (每 0.2s 採樣)</span>
            <div
              className={`w-6 h-6 rounded-full transition-colors duration-100 ease-linear shadow-lg ${isSampling ? 'bg-lime-400 shadow-lime-400/50' : 'bg-gray-700'}`}
              title={isSampling ? '採樣中...' : '閒置'}
            ></div>
          </div>
          <p className="text-sm text-gray-500 mt-2">綠燈閃爍表示麥克風正在進行 0.1 秒的噪音採樣。</p>
        </div>

        {/* Current Max Level Display */}
        <div className="flex-1 bg-gray-800 p-4 rounded-xl shadow-inner border border-gray-700">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-300">本秒最大值</span>
            <span className="text-2xl font-mono text-green-400">
              {maxLevelLastSecondRef.current.toFixed(2)}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            如果此值超過閥值 {threshold}，將會被記錄。
          </p>
        </div>
      </div>

      {/* Settings Panel */}
      <div className="mb-8 p-4 bg-gray-800 rounded-xl shadow-lg border border-gray-700">
        <h2 className="text-xl font-bold text-gray-300 mb-4 border-b border-gray-700 pb-2 flex items-center">
          <Maximize2 className="w-5 h-5 mr-2 text-green-400" />
          監測參數設定
        </h2>

        {/* Threshold Control */}
        <div className="flex items-center justify-between py-2 border-b border-gray-700/50">
          <span className="font-medium text-gray-400">噪音閥值 (Y軸最小值): {threshold}</span>
          <div className="flex">
            <ControlButton icon={Minus} onClick={() => setThreshold(t => Math.max(0, t - 1))} label="減少閥值" />
            <ControlButton icon={Plus} onClick={() => setThreshold(t => t + 1)} label="增加閥值" />
          </div>
        </div>

        {/* Y-Axis Max Control */}
        <div className="flex items-center justify-between py-2 border-b border-gray-700/50">
          <span className="font-medium text-gray-400">縱座標最大值: {yAxisMax}</span>
          <div className="flex">
            <ControlButton 
                icon={Minus} 
                onClick={() => setYAxisMax(y => Math.max(threshold + 1, y - 5))} 
                label="減少最大值" 
                disabled={yAxisMax <= threshold + 1}
            />
            <ControlButton icon={Plus} onClick={() => setYAxisMax(y => y + 5)} label="增加最大值" />
          </div>
        </div>

        {/* Record Limit Control */}
        <div className="flex items-center justify-between py-2">
          <span className="font-medium text-gray-400">
            記錄保留上限: {recordLimit === 0 ? '無限' : recordLimit}
          </span>
          <div className="flex">
            <ControlButton icon={Minus} onClick={() => setRecordLimit(l => Math.max(0, l - 10))} label="減少上限" />
            <ControlButton icon={Plus} onClick={() => setRecordLimit(l => l + 10)} label="增加上限" />
            <ControlButton icon={Trash2} onClick={() => setRecordLimit(0)} label="設定為無限" />
          </div>
        </div>

        <p className="text-sm text-gray-500 mt-4">
          當超過記錄上限 ({recordLimit === 0 ? '無上限' : recordLimit}) 時，系統將自動丟棄最小值。
        </p>
      </div>

      {/* Historical Chart */}
      <div className="flex-1 p-4 bg-gray-800 rounded-xl shadow-lg border border-gray-700 min-h-[300px] mb-4">
        <h2 className="text-xl font-bold text-gray-300 mb-4 border-b border-gray-700 pb-2 flex items-center">
          <BarChart2 className="w-5 h-5 mr-2 text-green-400" />
          歷史噪音事件點狀圖 (每秒更新)
        </h2>
        <div className="h-[250px] w-full">
            <Chart data={sortedRecords} />
        </div>
      </div>
      
      {/* New: Data Export Controls (新的數據輸出控制) */}
      <DownloadControls records={noiseRecords} recordCount={noiseRecords.length} />
    </div>
  );
};

// ======================================================================================
// 4. Main App Component
// ======================================================================================

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-0 sm:p-4">
      <div className="h-full w-full max-w-7xl mx-auto rounded-xl shadow-2xl">
        {isAuthenticated ? (
          <NoiseMonitor />
        ) : (
          <AuthScreen onAuthenticate={setIsAuthenticated} />
        )}
      </div>
    </div>
  );
}

