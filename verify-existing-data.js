// Script to verify the fix works with existing user data
// This demonstrates that no data migration is needed

// Simulate existing user data (what's already in the database)
const existingUserData = {
  vehicles: [
    {
      id: 'vehicle1',
      name: 'Honda City',
      currentMileage: 15000
    }
  ],
  fuelLogs: [
    {
      id: 'log1',
      vehicleId: 'vehicle1',
      date: new Date('2024-01-01'),
      odometerReading: 10000,
      fuelQuantity: 40,
      fuelPrice: 100,
      totalCost: 4000,
      // Old stored values (these were calculated with old method)
      mileage: 0, // First entry, no previous data
      distanceTraveled: 0
    },
    {
      id: 'log2',
      vehicleId: 'vehicle1',
      date: new Date('2024-01-15'),
      odometerReading: 10500,
      fuelQuantity: 50,
      fuelPrice: 100,
      totalCost: 5000,
      // Old stored values
      mileage: 10.0, // 500 km / 50 L
      distanceTraveled: 500
    },
    {
      id: 'log3',
      vehicleId: 'vehicle1',
      date: new Date('2024-02-01'),
      odometerReading: 11200,
      fuelQuantity: 70,
      fuelPrice: 100,
      totalCost: 7000,
      // Old stored values
      mileage: 10.0, // 700 km / 70 L
      distanceTraveled: 700
    },
    {
      id: 'log4',
      vehicleId: 'vehicle1',
      date: new Date('2024-02-15'),
      odometerReading: 12000,
      fuelQuantity: 80,
      fuelPrice: 100,
      totalCost: 8000,
      // Old stored values
      mileage: 10.0, // 800 km / 80 L
      distanceTraveled: 800
    }
  ]
};

// NEW WEIGHTED AVERAGE CALCULATION (from the fix)
function calculateWeightedAverage(fuelLogs) {
  if (!fuelLogs || fuelLogs.length === 0) return 0;

  const sortedLogs = [...fuelLogs].sort((a, b) => a.odometerReading - b.odometerReading);

  let totalDistance = 0;
  let totalFuel = 0;

  if (sortedLogs.length >= 2) {
    for (let i = 1; i < sortedLogs.length; i++) {
      const prevLog = sortedLogs[i - 1];
      const currLog = sortedLogs[i];

      const distance = currLog.odometerReading - prevLog.odometerReading;
      const fuelUsed = currLog.fuelQuantity;

      if (distance > 0 && fuelUsed > 0) {
        totalDistance += distance;
        totalFuel += fuelUsed;
      }
    }
  }

  return totalFuel > 0 ? totalDistance / totalFuel : 0;
}

// OLD ARITHMETIC MEAN CALCULATION (before the fix)
function calculateArithmeticMean(fuelLogs) {
  // This used the stored 'mileage' field from each log
  const logsWithMileage = fuelLogs.filter(log => log.mileage > 0);
  if (logsWithMileage.length === 0) return 0;

  const totalMileage = logsWithMileage.reduce((sum, log) => sum + log.mileage, 0);
  return totalMileage / logsWithMileage.length;
}

// TEST THE FIX
console.log('=== Testing Fix With Existing User Data ===\n');

console.log('Existing fuel logs in database:');
existingUserData.fuelLogs.forEach(log => {
  console.log(`  ${log.date.toLocaleDateString()}: ${log.odometerReading} km, ${log.fuelQuantity}L, Stored mileage: ${log.mileage} km/l`);
});

console.log('\n--- Calculations ---');

// Old method (using stored mileage values)
const oldAverage = calculateArithmeticMean(existingUserData.fuelLogs);
console.log(`Old Method (Arithmetic Mean): ${oldAverage.toFixed(2)} km/l`);

// New method (recalculating from raw data)
const newAverage = calculateWeightedAverage(existingUserData.fuelLogs);
console.log(`New Method (Weighted Average): ${newAverage.toFixed(2)} km/l`);

// Manual verification
console.log('\n--- Manual Verification ---');
console.log('Total Distance: 500 + 700 + 800 = 2000 km');
console.log('Total Fuel: 50 + 70 + 80 = 200 L');
console.log('Correct Average: 2000 / 200 = 10.0 km/l');

console.log('\n--- Result ---');
if (Math.abs(newAverage - 10.0) < 0.01) {
  console.log('✓ NEW METHOD IS CORRECT!');
  console.log('✓ Works perfectly with existing data!');
  console.log('✓ No database migration needed!');
} else {
  console.log('✗ Something went wrong');
}

console.log('\n--- Key Points ---');
console.log('1. Existing data in database: UNCHANGED');
console.log('2. Stored mileage values: IGNORED (we recalculate)');
console.log('3. Calculation method: IMPROVED (weighted average)');
console.log('4. User experience: SEAMLESS (automatic fix)');
console.log('5. Data migration: NOT REQUIRED');

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateWeightedAverage,
    calculateArithmeticMean,
    existingUserData
  };
}
