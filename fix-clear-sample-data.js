// Quick fix script to update clearSampleData function
// Run this in the browser console on the generate-sample-data.html page

// Updated clearSampleData function that handles clearAll parameter
window.clearAllSampleData = async function(userId) {
  console.log('🗑️ Clearing ALL data for user:', userId);
  
  const result = await window.sampleDataService.clearSampleData(userId, true);
  console.log('✅ Result:', result);
  
  return result;
};

console.log('✅ Helper function loaded!');
console.log('📝 To clear ALL data (including legacy without isSampleData flag), run:');
console.log('   await clearAllSampleData("YOUR_USER_ID")');
console.log('');
console.log('📝 To clear only sample data (with isSampleData flag), use the button or run:');
console.log('   await window.sampleDataService.clearSampleData("YOUR_USER_ID", false)');
