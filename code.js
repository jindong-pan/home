import React, { useState, useEffect } from "react";

// Hardcoded secret for demonstration
const SHARED_SECRET = "your-secret-key"; // change this to your own secret

// Simple hash function for demonstration (not secure for real auth)
function simpleHash(str) {
  let hash = 0;
  for(let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Generate code that changes every 5 minutes
function generateDynamicPassword(secret) {
  const interval = Math.floor(Date.now() / 1000 / (5 * 60)); // 5-minute intervals
  const hashInput = secret + interval;
  const hash = simpleHash(hashInput);
  // return last 6 digits, pad with zeros if necessary
  return ("" + (hash % 1000000)).padStart(6, "0");
}

const TryDynamicPassword = () => {
  const [password, setPassword] = useState("");

  useEffect(() => {
    // Function to update password every 5 minutes
    const updatePassword = () => {
      setPassword(generateDynamicPassword(SHARED_SECRET));
    };

    updatePassword(); // Initial call
    const timer = setInterval(updatePassword, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(timer); // Cleanup on unmount
  }, []);

  return (
    <div style={{margin: 40, fontFamily: 'sans-serif', fontSize: 22, lineHeight: 2}}>
      <h2>Dynamic password demo</h2>
      <p>
        Your password (refreshes every 5 minutes): <br />
        <strong style={{fontSize: 32}}>{password}</strong>
      </p>
      <p>
        This uses the simplified Google Authenticator algorithm.<br />
        You can customize this code or use the logic in your other components!
      </p>
    </div>
  );
};

export default TryDynamicPassword;
