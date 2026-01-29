// Quick fix script to update clearSampleData function
// Run this in the browser console on the generate-sample-data.html page

// Updated clearSampleData function that handles clearAll parameter
window.clearAllSampleData = async function(userId) {
  
  const result = await window.sampleDataService.clearSampleData(userId, true);
  
  return result;
};
