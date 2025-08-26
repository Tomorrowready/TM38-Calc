import React, { useState, useEffect } from 'react';
import { Calculator, FileText, AlertTriangle, CheckCircle, Truck, Package } from 'lucide-react';

const ConcretePointLoadCalculator = () => {
  // State for calculation type selection
  const [calculationType, setCalculationType] = useState('racking'); // 'racking' or 'wheel'
  
  // State for input values
  const [inputs, setInputs] = useState({
    // Ground conditions
    cbrValue: 10,
    scalaValue: '',
    groundAssessmentType: 'cbr', // 'cbr' or 'scala'
    
    // Sub-base
    hasSubbase: true,
    subbaseThickness: 150,
    
    // Concrete properties
    concreteStrength: 35,
    isPrestressed: false,
    residualStrength: 2.0,
    assessmentAge: 28, // 28 or 90 days
    
    // Joint details
    jointType: 'dowel', // 'dowel', 'tied', 'non_dowel'
    
    // Loading details (shared)
    loadPosition: 'interior', // 'interior', 'edge', 'corner'
    baseplateX: 140,
    baseplateY: 140,
    pointLoad: 40,
    loadRepetitions: 8000,
    
    // Racking-specific inputs
    rackSpacingX: 2.7, // Longitudinal spacing
    rackSpacingY: 1.0, // Transverse spacing
    isBackToBack: false,
    backToBackSpacing: 0.8, // Spacing between back-to-back racks
    
    // Wheel load-specific inputs
    vehicleType: 'forklift', // 'forklift', 'truck', 'custom'
    wheelConfiguration: 'single', // 'single', 'dual', 'tandem'
    wheelDiameter: 250, // mm
    tireWidth: 100, // mm
    tireType: 'pneumatic', // 'pneumatic', 'solid', 'steel'
    wheelSpacing: 150, // mm - spacing between dual wheels or tandem wheels
    vehicleSpeed: 'slow', // 'slow', 'medium', 'fast'
    turnRadius: 2.5, // m
    frequencyFactor: 1.0 // Traffic frequency factor
  });

  // State for results
  const [results, setResults] = useState({
    modulus: 0,
    allowableStress: 0,
    interior: {
      equivalentRadius: 0,
      radiusOfStiffness: 0,
      stress: 0,
      thickness: 0,
      isAdequate: false
    },
    edge: {
      equivalentRadius: 0,
      radiusOfStiffness: 0,
      stress: 0,
      thickness: 0,
      isAdequate: false
    },
    corner: {
      equivalentRadius: 0,
      radiusOfStiffness: 0,
      stress: 0,
      thickness: 0,
      isAdequate: false
    }
  });

  // Convert CBR to modulus of subgrade reaction
  const cbrToModulus = (cbr) => {
    // From Figure 1.2 in TM38 - approximate relationship
    if (cbr <= 2) return 15;
    if (cbr <= 5) return 37;
    if (cbr <= 10) return 54;
    if (cbr <= 20) return 68;
    if (cbr <= 40) return 82;
    return 109;
  };

  // Convert Scala penetrometer to CBR
  const scalaToCBR = (scala) => {
    // From Figure 1.3 in TM38
    const scalaNum = parseFloat(scala);
    if (scalaNum >= 100) return 2;
    if (scalaNum >= 50) return 3;
    if (scalaNum >= 20) return 5;
    if (scalaNum >= 10) return 8;
    if (scalaNum >= 5) return 12;
    if (scalaNum >= 2) return 20;
    if (scalaNum >= 1) return 30;
    return 50;
  };

  // Enhance modulus for sub-base (from Figure 3.1)
  const enhanceModulusForSubbase = (k, thickness) => {
    if (!inputs.hasSubbase || thickness < 100) return k;
    
    // Approximate enhancement from Figure 3.1
    const enhancement = 1 + (thickness / 300) * 0.5;
    return Math.min(k * enhancement, k * 2); // Cap at double
  };

  // Calculate modulus of rupture
  const calculateModulusOfRupture = (fc, age, repetitions) => {
    // From Equation 3.1 in TM38
    const k1 = age >= 90 ? 1.1 : 1.0;
    
    // Load repetition factor k2
    let k2 = 1.0;
    if (repetitions >= 400000) k2 = 0.77;
    else if (repetitions >= 300000) k2 = 0.78;
    else if (repetitions >= 200000) k2 = 0.81;
    else if (repetitions >= 100000) k2 = 0.84;
    else if (repetitions >= 50000) k2 = 0.89;
    else if (repetitions >= 30000) k2 = 0.90;
    else if (repetitions >= 10000) k2 = 0.96;
    
    return 0.456 * k1 * k2 * Math.pow(fc, 0.66);
  };

  // Calculate radius of relative stiffness
  const calculateRadiusOfStiffness = (E, h, k, mu = 0.15) => {
    // From Equation 3.3 in TM38
    const denominator = 12 * (1 - Math.pow(mu, 2)) * k * 1000;
    return Math.pow((E * Math.pow(h, 3)) / denominator, 0.25);
  };

  // Calculate equivalent radius of loaded area
  const calculateEquivalentRadius = (baseX, baseY, h, isBackToBack = false, backToBackSpacing = 0) => {
    // From Equation 3.4 in TM38
    let area = (baseX * baseY) / 1000000; // Convert to m²
    
    // For back-to-back racks, check if loads should be combined
    if (calculationType === 'racking' && isBackToBack && backToBackSpacing < 2 * h) {
      // Combine loads when centerline distance < 2 * slab thickness
      // Use effective area combining both baseplates
      area = 2 * area; // Double the area for combined loading
    }
    
    const r = Math.sqrt(area / Math.PI) * 1000; // Convert back to mm
    
    if (r < 1.72 * h) {
      const b = Math.sqrt(1.6 * Math.pow(r, 2) + Math.pow(h, 2)) - 0.675 * h;
      return Math.max(b, r);
    } else {
      return r;
    }
  };

  // Calculate equivalent contact area for wheel loads
  const calculateWheelContactArea = () => {
    const diameter = inputs.wheelDiameter;
    const width = inputs.tireWidth;
    const spacing = inputs.wheelSpacing;
    
    // Calculate single wheel contact area first
    let singleContactLength, singleContactWidth;
    
    if (inputs.tireType === 'pneumatic') {
      // Pneumatic tires - elliptical contact patch
      singleContactLength = 0.6 * Math.sqrt(diameter * inputs.pointLoad * 10); // Approximate
      singleContactWidth = width * 0.8; // Approximate contact width
    } else if (inputs.tireType === 'solid') {
      // Solid tires - rectangular contact patch
      singleContactLength = 0.4 * Math.sqrt(diameter * inputs.pointLoad * 10);
      singleContactWidth = width * 0.7;
    } else {
      // Steel wheels - line contact approximation
      singleContactLength = width * 0.9;
      singleContactWidth = Math.max(10, inputs.pointLoad / 10); // Very narrow contact
    }
    
    // Ensure minimum contact dimensions
    singleContactLength = Math.max(50, singleContactLength);
    singleContactWidth = Math.max(50, singleContactWidth);
    
    // Calculate effective contact area based on wheel configuration
    let effectiveLength, effectiveWidth, totalArea;
    
    if (inputs.wheelConfiguration === 'single') {
      // Single wheel
      effectiveLength = singleContactLength;
      effectiveWidth = singleContactWidth;
      totalArea = effectiveLength * effectiveWidth;
    } else if (inputs.wheelConfiguration === 'dual') {
      // Dual wheels side-by-side
      effectiveLength = singleContactLength;
      
      // If wheels are close together, they interact
      if (spacing < 2 * singleContactWidth) {
        // Close spacing - combine into single effective contact area
        effectiveWidth = (2 * singleContactWidth) + spacing;
        totalArea = effectiveLength * effectiveWidth;
      } else {
        // Wide spacing - treat as separate contacts but sum areas
        effectiveWidth = singleContactWidth;
        totalArea = 2 * (effectiveLength * effectiveWidth);
        // For equivalent radius calculation, use combined area
        effectiveWidth = Math.sqrt((2 * singleContactLength * singleContactWidth) / singleContactLength);
      }
    } else if (inputs.wheelConfiguration === 'tandem') {
      // Tandem wheels front-to-back
      effectiveWidth = singleContactWidth;
      
      // If wheels are close together, they interact
      if (spacing < 2 * singleContactLength) {
        // Close spacing - combine into single effective contact area
        effectiveLength = (2 * singleContactLength) + spacing;
        totalArea = effectiveLength * effectiveWidth;
      } else {
        // Wide spacing - treat as separate contacts but sum areas
        effectiveLength = singleContactLength;
        totalArea = 2 * (effectiveLength * effectiveWidth);
        // For equivalent radius calculation, use combined area
        effectiveLength = Math.sqrt((2 * singleContactLength * singleContactWidth) / singleContactWidth);
      }
    }
    
    return {
      length: effectiveLength,
      width: effectiveWidth,
      area: totalArea / 1000000, // Convert to m²
      singleLength: singleContactLength,
      singleWidth: singleContactWidth,
      configuration: inputs.wheelConfiguration
    };
  };

  // Calculate thickness for a specific position
  const calculateThicknessForPosition = (position, modulus, hasLoadTransfer, allowableStress) => {
    let thickness = 125; // Starting minimum thickness
    const maxIterations = 20;
    let iteration = 0;
    
    while (iteration < maxIterations) {
      // Calculate concrete modulus of elasticity
      const E = 5000 * Math.sqrt(inputs.concreteStrength) * 1000; // Convert to kPa
      
      // Calculate radius of relative stiffness
      const radiusOfStiffness = calculateRadiusOfStiffness(E, thickness, modulus);
      
      // Calculate equivalent radius based on calculation type
      let equivalentRadius;
      if (calculationType === 'racking') {
        equivalentRadius = calculateEquivalentRadius(
          inputs.baseplateX, 
          inputs.baseplateY, 
          thickness,
          inputs.isBackToBack,
          inputs.backToBackSpacing * 1000 // Convert to mm
        );
      } else {
        // Wheel load calculation
        const contactArea = calculateWheelContactArea();
        equivalentRadius = calculateEquivalentRadius(
          contactArea.length,
          contactArea.width,
          thickness
        );
      }
      
      // Calculate stress
      const stress = calculateStress(
        inputs.pointLoad,
        thickness,
        radiusOfStiffness,
        equivalentRadius,
        position,
        hasLoadTransfer,
        calculationType === 'racking' ? inputs.isBackToBack : false,
        calculationType === 'racking' ? inputs.backToBackSpacing * 1000 : 0 // Convert to mm
      );
      
      // Apply load factor and frequency factor for wheels
      let designStress = stress * 1.5;
      if (calculationType === 'wheel') {
        designStress *= inputs.frequencyFactor;
      }
      
      // Check if adequate
      const isAdequate = designStress <= allowableStress;
      
      if (isAdequate) {
        return {
          equivalentRadius,
          radiusOfStiffness,
          stress: designStress,
          thickness,
          isAdequate: true
        };
      }
      
      // Increase thickness and try again
      thickness += 25;
      iteration++;
    }
    
    // If no adequate solution found, return last calculated values
    const E = 5000 * Math.sqrt(inputs.concreteStrength) * 1000;
    const radiusOfStiffness = calculateRadiusOfStiffness(E, thickness, modulus);
    
    let equivalentRadius;
    if (calculationType === 'racking') {
      equivalentRadius = calculateEquivalentRadius(
        inputs.baseplateX, 
        inputs.baseplateY, 
        thickness,
        inputs.isBackToBack,
        inputs.backToBackSpacing * 1000
      );
    } else {
      const contactArea = calculateWheelContactArea();
      equivalentRadius = calculateEquivalentRadius(
        contactArea.length,
        contactArea.width,
        thickness
      );
    }
    
    let stress = calculateStress(
      inputs.pointLoad,
      thickness,
      radiusOfStiffness,
      equivalentRadius,
      position,
      hasLoadTransfer,
      calculationType === 'racking' ? inputs.isBackToBack : false,
      calculationType === 'racking' ? inputs.backToBackSpacing * 1000 : 0
    ) * 1.5;
    
    if (calculationType === 'wheel') {
      stress *= inputs.frequencyFactor;
    }
    
    return {
      equivalentRadius,
      radiusOfStiffness,
      stress,
      thickness,
      isAdequate: false
    };
  };

  const calculateStress = (P, h, l, b, position, hasLoadTransfer, isBackToBack, backToBackSpacing) => {
    const mu = 0.15; // Poisson's ratio
    
    // Adjust load for back-to-back configuration (racking only)
    let effectiveLoad = P;
    if (calculationType === 'racking' && isBackToBack && backToBackSpacing < 2 * h) {
      // Combined loading effect when racks are close together
      effectiveLoad = P * 2; // Double the load for combined effect
    }
    
    if (position === 'interior') {
      // Equation 3.2 - Interior loading
      const stress = (effectiveLoad * 1000 / Math.pow(h, 2)) * (0.70 * (1 + mu) * Math.log(l / b) + 1.069);
      return stress * Math.pow(10, 6) / 1000; // Convert to kPa
    } else if (position === 'edge') {
      // Equation 3.5 - Edge loading
      let stress = 5.19 * (1 + 0.54 * mu) * (effectiveLoad * 1000 / Math.pow(h, 2)) * 
                   (4 * Math.log(l / b) + Math.log(b / 25.4));
      stress = stress * Math.pow(10, 6) / 1000; // Convert to kPa
      return hasLoadTransfer ? stress * 0.85 : stress;
    } else if (position === 'corner') {
      // Equation 3.6 - Corner loading
      let stress = 41.2 * (effectiveLoad * 1000 / Math.pow(h, 2)) * 
                   (1 - Math.pow(b / l, 0.5)) / (0.925 + 0.22 * (b / l));
      stress = stress * Math.pow(10, 6) / 1000; // Convert to kPa
      return hasLoadTransfer ? stress * 0.7 : stress;
    }
    
    return 0;
  };

  // Main calculation function
  useEffect(() => {
    try {
      // Determine CBR value
      let cbrValue = inputs.cbrValue;
      if (inputs.groundAssessmentType === 'scala' && inputs.scalaValue) {
        cbrValue = scalaToCBR(inputs.scalaValue);
      }

      // Get base modulus
      let modulus = cbrToModulus(cbrValue);
      
      // Enhance for sub-base if applicable
      if (inputs.hasSubbase) {
        modulus = enhanceModulusForSubbase(modulus, inputs.subbaseThickness);
      }

      // Calculate allowable stress
      let allowableStress = calculateModulusOfRupture(
        inputs.concreteStrength,
        inputs.assessmentAge,
        inputs.loadRepetitions
      ) * 1000; // Convert to kPa
      
      // Add prestress if applicable
      if (inputs.isPrestressed) {
        allowableStress += inputs.residualStrength * 1000;
      }

      // Determine if load transfer exists
      const hasLoadTransfer = inputs.jointType === 'dowel' || inputs.jointType === 'tied';

      // Calculate thickness for all three positions
      const interiorResults = calculateThicknessForPosition('interior', modulus, hasLoadTransfer, allowableStress);
      const edgeResults = calculateThicknessForPosition('edge', modulus, hasLoadTransfer, allowableStress);
      const cornerResults = calculateThicknessForPosition('corner', modulus, hasLoadTransfer, allowableStress);

      // Update results with all calculations
      setResults({
        modulus,
        allowableStress,
        interior: interiorResults,
        edge: edgeResults,
        corner: cornerResults
      });
    } catch (error) {
      console.error('Calculation error:', error);
      // Set default results on error
      setResults({
        modulus: 0,
        allowableStress: 0,
        interior: {
          equivalentRadius: 0,
          radiusOfStiffness: 0,
          stress: 0,
          thickness: 150,
          isAdequate: false
        },
        edge: {
          equivalentRadius: 0,
          radiusOfStiffness: 0,
          stress: 0,
          thickness: 150,
          isAdequate: false
        },
        corner: {
          equivalentRadius: 0,
          radiusOfStiffness: 0,
          stress: 0,
          thickness: 150,
          isAdequate: false
        }
      });
    }
  }, [inputs, calculationType]);

  const handleInputChange = (field, value) => {
    setInputs(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Calculator className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-800">
            Concrete Ground Floor Point Load Calculator
          </h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <FileText className="w-4 h-4" />
          <span>Based on TM38 - CCANZ Design Guidelines</span>
        </div>
      </div>

      {/* Calculation Type Selection */}
      <div className="mb-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-4">Calculation Type</h3>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setCalculationType('racking')}
              className={`p-4 rounded-lg border-2 transition-all ${
                calculationType === 'racking'
                  ? 'border-blue-500 bg-blue-50 text-blue-800'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <Package className="w-6 h-6" />
                <span className="font-semibold">Racking Loads</span>
              </div>
              <p className="text-sm">For warehouse racking and storage systems</p>
            </button>
            <button
              onClick={() => setCalculationType('wheel')}
              className={`p-4 rounded-lg border-2 transition-all ${
                calculationType === 'wheel'
                  ? 'border-blue-500 bg-blue-50 text-blue-800'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <Truck className="w-6 h-6" />
                <span className="font-semibold">Wheel Loads</span>
              </div>
              <p className="text-sm">For forklift and vehicle wheel loading</p>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="space-y-6">
          {/* Ground Assessment */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-4">Ground Assessment</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assessment Method
                </label>
                <select
                  value={inputs.groundAssessmentType}
                  onChange={(e) => handleInputChange('groundAssessmentType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cbr">CBR Value</option>
                  <option value="scala">Scala Penetrometer</option>
                </select>
              </div>

              {inputs.groundAssessmentType === 'cbr' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CBR Value (%)
                  </label>
                  <input
                    type="number"
                    value={inputs.cbrValue}
                    onChange={(e) => handleInputChange('cbrValue', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="100"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Scala Penetrometer (mm per blow)
                  </label>
                  <input
                    type="number"
                    value={inputs.scalaValue}
                    onChange={(e) => handleInputChange('scalaValue', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0.1"
                    step="0.1"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Sub-base */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-4">Sub-base</h3>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={inputs.hasSubbase}
                  onChange={(e) => handleInputChange('hasSubbase', e.target.checked)}
                  className="mr-2"
                />
                <label className="text-sm font-medium text-gray-700">
                  Granular sub-base present
                </label>
              </div>

              {inputs.hasSubbase && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sub-base Thickness (mm)
                  </label>
                  <input
                    type="number"
                    value={inputs.subbaseThickness}
                    onChange={(e) => handleInputChange('subbaseThickness', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="100"
                    max="500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Concrete Properties */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-4">Concrete Properties</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Concrete Strength f'c (MPa)
                </label>
                <input
                  type="number"
                  value={inputs.concreteStrength}
                  onChange={(e) => handleInputChange('concreteStrength', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="20"
                  max="50"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={inputs.isPrestressed}
                  onChange={(e) => handleInputChange('isPrestressed', e.target.checked)}
                  className="mr-2"
                />
                <label className="text-sm font-medium text-gray-700">
                  Post-tensioned concrete
                </label>
              </div>

              {inputs.isPrestressed && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Residual Prestress (MPa)
                  </label>
                  <input
                    type="number"
                    value={inputs.residualStrength}
                    onChange={(e) => handleInputChange('residualStrength', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0.5"
                    max="5.0"
                    step="0.1"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assessment Age
                </label>
                <select
                  value={inputs.assessmentAge}
                  onChange={(e) => handleInputChange('assessmentAge', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={28}>28 days</option>
                  <option value={90}>90 days</option>
                </select>
              </div>
            </div>
          </div>

          {/* Joint Details */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-4">Joint Details</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Joint Type
                </label>
                <select
                  value={inputs.jointType}
                  onChange={(e) => handleInputChange('jointType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="dowel">Dowel joints (load transfer)</option>
                  <option value="tied">Tied joints (aggregate interlock)</option>
                  <option value="non_dowel">Non-dowel joints (no load transfer)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Load Position (for stress display)
                </label>
                <select
                  value={inputs.loadPosition}
                  onChange={(e) => handleInputChange('loadPosition', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="interior">Interior of slab</option>
                  <option value="edge">Edge of slab</option>
                  <option value="corner">Corner of slab</option>
                </select>
                <p className="text-xs text-gray-600 mt-1">
                  Note: Thickness is calculated for all positions below
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Loading Details and Results - Right Column */}
        <div className="space-y-6">
          {/* Racking Loading Details */}
          {calculationType === 'racking' && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-4">Racking Loading Details</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rack Spacing X (m) - Longitudinal
                    </label>
                    <input
                      type="number"
                      value={inputs.rackSpacingX}
                      onChange={(e) => handleInputChange('rackSpacingX', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1.0"
                      max="5.0"
                      step="0.1"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rack Spacing Y (m) - Transverse
                    </label>
                    <input
                      type="number"
                      value={inputs.rackSpacingY}
                      onChange={(e) => handleInputChange('rackSpacingY', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0.8"
                      max="2.0"
                      step="0.1"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={inputs.isBackToBack}
                      onChange={(e) => handleInputChange('isBackToBack', e.target.checked)}
                      className="mr-2"
                    />
                    <label className="text-sm font-medium text-gray-700">
                      Back-to-back rack configuration
                    </label>
                  </div>

                  {inputs.isBackToBack && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Spacing Between Back-to-Back Racks (m)
                      </label>
                      <input
                        type="number"
                        value={inputs.backToBackSpacing}
                        onChange={(e) => handleInputChange('backToBackSpacing', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0.1"
                        max="2.0"
                        step="0.1"
                      />
                      <p className="text-xs text-gray-600 mt-1">
                        When &lt; {results.interior.thickness > 0 ? (results.interior.thickness * 2 / 1000).toFixed(2) : '0.30'}m (2×thickness), loads are combined for analysis
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Baseplate X (mm)
                    </label>
                    <input
                      type="number"
                      value={inputs.baseplateX}
                      onChange={(e) => handleInputChange('baseplateX', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="50"
                      max="500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Baseplate Y (mm)
                    </label>
                    <input
                      type="number"
                      value={inputs.baseplateY}
                      onChange={(e) => handleInputChange('baseplateY', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="50"
                      max="500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Point Load (kN)
                  </label>
                  <input
                    type="number"
                    value={inputs.pointLoad}
                    onChange={(e) => handleInputChange('pointLoad', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Load Repetitions
                  </label>
                  <select
                    value={inputs.loadRepetitions}
                    onChange={(e) => handleInputChange('loadRepetitions', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={8000}>&lt; 8,000 (static loading)</option>
                    <option value={10000}>10,000</option>
                    <option value={30000}>30,000</option>
                    <option value={50000}>50,000</option>
                    <option value={100000}>100,000</option>
                    <option value={200000}>200,000</option>
                    <option value={300000}>300,000</option>
                    <option value={400000}>400,000+</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Wheel Loading Details */}
          {calculationType === 'wheel' && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-4">Wheel Loading Details</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle Type
                  </label>
                  <select
                    value={inputs.vehicleType}
                    onChange={(e) => handleInputChange('vehicleType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="forklift">Forklift</option>
                    <option value="truck">Heavy Truck</option>
                    <option value="custom">Custom Vehicle</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Wheel Configuration
                  </label>
                  <select
                    value={inputs.wheelConfiguration}
                    onChange={(e) => handleInputChange('wheelConfiguration', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="single">Single Wheel</option>
                    <option value="dual">Dual Wheels (side-by-side)</option>
                    <option value="tandem">Tandem Wheels (front-to-back)</option>
                  </select>
                </div>

                {(inputs.wheelConfiguration === 'dual' || inputs.wheelConfiguration === 'tandem') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {inputs.wheelConfiguration === 'dual' ? 'Spacing Between Dual Wheels (mm)' : 'Spacing Between Tandem Wheels (mm)'}
                    </label>
                    <input
                      type="number"
                      value={inputs.wheelSpacing}
                      onChange={(e) => handleInputChange('wheelSpacing', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="50"
                      max="1000"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      {inputs.wheelConfiguration === 'dual' 
                        ? 'Center-to-center spacing between dual wheels'
                        : 'Center-to-center spacing between tandem wheels'
                      }
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Wheel Diameter (mm)
                    </label>
                    <input
                      type="number"
                      value={inputs.wheelDiameter}
                      onChange={(e) => handleInputChange('wheelDiameter', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="100"
                      max="1000"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tire Width (mm)
                    </label>
                    <input
                      type="number"
                      value={inputs.tireWidth}
                      onChange={(e) => handleInputChange('tireWidth', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="50"
                      max="500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tire Type
                  </label>
                  <select
                    value={inputs.tireType}
                    onChange={(e) => handleInputChange('tireType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pneumatic">Pneumatic (air-filled)</option>
                    <option value="solid">Solid rubber</option>
                    <option value="steel">Steel wheel</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Wheel Load (kN)
                  </label>
                  <input
                    type="number"
                    value={inputs.pointLoad}
                    onChange={(e) => handleInputChange('pointLoad', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle Speed
                  </label>
                  <select
                    value={inputs.vehicleSpeed}
                    onChange={(e) => handleInputChange('vehicleSpeed', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="slow">Slow (&lt;5 km/h)</option>
                    <option value="medium">Medium (5-15 km/h)</option>
                    <option value="fast">Fast (&gt;15 km/h)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Turn Radius (m)
                  </label>
                  <input
                    type="number"
                    value={inputs.turnRadius}
                    onChange={(e) => handleInputChange('turnRadius', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1.0"
                    max="10.0"
                    step="0.1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Traffic Frequency Factor
                  </label>
                  <select
                    value={inputs.frequencyFactor}
                    onChange={(e) => handleInputChange('frequencyFactor', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={1.0}>Light traffic (1.0)</option>
                    <option value={1.1}>Medium traffic (1.1)</option>
                    <option value={1.2}>Heavy traffic (1.2)</option>
                    <option value={1.3}>Very heavy traffic (1.3)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Load Repetitions
                  </label>
                  <select
                    value={inputs.loadRepetitions}
                    onChange={(e) => handleInputChange('loadRepetitions', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={8000}>&lt; 8,000 (occasional)</option>
                    <option value={10000}>10,000</option>
                    <option value={30000}>30,000</option>
                    <option value={50000}>50,000</option>
                    <option value={100000}>100,000</option>
                    <option value={200000}>200,000</option>
                    <option value={300000}>300,000</option>
                    <option value={400000}>400,000+ (very frequent)</option>
                  </select>
                </div>

                {/* Contact Area Display */}
                <div className="mt-4 p-3 bg-blue-50 rounded-md">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">Calculated Contact Area:</h4>
                  {(() => {
                    const contactArea = calculateWheelContactArea();
                    return (
                      <div className="text-sm text-blue-700 space-y-1">
                        <p><strong>Configuration:</strong> {contactArea.configuration}</p>
                        {contactArea.configuration !== 'single' && (
                          <p><strong>Single Wheel:</strong> {contactArea.singleLength.toFixed(0)} × {contactArea.singleWidth.toFixed(0)} mm</p>
                        )}
                        <p><strong>Effective Contact:</strong> {contactArea.length.toFixed(0)} × {contactArea.width.toFixed(0)} mm</p>
                        <p><strong>Total Area:</strong> {contactArea.area.toFixed(4)} m²</p>
                        {contactArea.configuration === 'dual' && (
                          <p className="text-xs text-blue-600 mt-2">
                            {inputs.wheelSpacing < 2 * contactArea.singleWidth 
                              ? '⚠️ Close spacing - wheels interact as combined contact'
                              : 'ℹ️ Wide spacing - wheels act independently'
                            }
                          </p>
                        )}
                        {contactArea.configuration === 'tandem' && (
                          <p className="text-xs text-blue-600 mt-2">
                            {inputs.wheelSpacing < 2 * contactArea.singleLength 
                              ? '⚠️ Close spacing - wheels interact as combined contact'
                              : 'ℹ️ Wide spacing - wheels act independently'
                            }
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Results Panel */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg border">
            <div className="flex items-center gap-3 mb-4">
              <Calculator className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-800">
                Calculation Results - All Load Positions
              </h3>
            </div>

            {/* Common Parameters */}
            <div className="bg-white p-4 rounded-lg mb-4">
              <h4 className="font-medium text-gray-800 mb-3">Common Design Parameters</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Enhanced Modulus (k):</span>
                  <p className="font-medium text-gray-800">
                    {results.modulus.toFixed(0)} MN/m³
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Allowable Stress:</span>
                  <p className="font-medium text-gray-800">
                    {results.allowableStress.toFixed(0)} kPa
                  </p>
                </div>
              </div>
            </div>

            {/* Results for each position */}
            <div className="space-y-4">
              {/* Interior Loading */}
              <div className="bg-white p-4 rounded-lg border-l-4 border-green-400">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-800">Interior Loading</h4>
                  {results.interior.isAdequate ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Required Thickness:</span>
                    <p className="font-bold text-lg text-blue-600">
                      {results.interior.thickness} mm
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Design Stress:</span>
                    <p className="font-medium text-gray-800">
                      {results.interior.stress.toFixed(0)} kPa
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Stress Ratio:</span>
                    <p className="font-medium text-gray-800">
                      {results.allowableStress > 0 ? ((results.interior.stress / results.allowableStress) * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Edge Loading */}
              <div className="bg-white p-4 rounded-lg border-l-4 border-yellow-400">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-800">Edge Loading</h4>
                  {results.edge.isAdequate ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Required Thickness:</span>
                    <p className="font-bold text-lg text-blue-600">
                      {results.edge.thickness} mm
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Design Stress:</span>
                    <p className="font-medium text-gray-800">
                      {results.edge.stress.toFixed(0)} kPa
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Stress Ratio:</span>
                    <p className="font-medium text-gray-800">
                      {results.allowableStress > 0 ? ((results.edge.stress / results.allowableStress) * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Corner Loading */}
              <div className="bg-white p-4 rounded-lg border-l-4 border-red-400">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-800">Corner Loading</h4>
                  {results.corner.isAdequate ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Required Thickness:</span>
                    <p className="font-bold text-lg text-blue-600">
                      {results.corner.thickness} mm
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Design Stress:</span>
                    <p className="font-medium text-gray-800">
                      {results.corner.stress.toFixed(0)} kPa
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Stress Ratio:</span>
                    <p className="font-medium text-gray-800">
                      {results.allowableStress > 0 ? ((results.corner.stress / results.allowableStress) * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Overall Design Summary */}
            <div className="mt-4 p-4 bg-white rounded-lg border-2 border-blue-200">
              <h4 className="font-medium text-gray-800 mb-2">Design Summary</h4>
              <div className="text-sm">
                <p className="font-medium text-blue-800">
                  Recommended Minimum Thickness: {Math.max(results.interior.thickness, results.edge.thickness, results.corner.thickness)} mm
                </p>
                <p className="text-gray-600 mt-1">
                  Governed by: {
                    results.corner.thickness >= results.edge.thickness && results.corner.thickness >= results.interior.thickness ? 'Corner Loading' :
                    results.edge.thickness >= results.interior.thickness ? 'Edge Loading' : 'Interior Loading'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Design Notes */}
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h4 className="font-medium text-yellow-800 mb-2">Design Notes:</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Load factor of 1.5 applied to design loads</li>
              <li>• Minimum slab thickness typically 125mm for industrial floors</li>
              <li>• Consider durability requirements for concrete strength selection</li>
              <li>• Edge and corner loadings require higher thickness than interior</li>
              <li>• Fatigue considerations reduce allowable stress for high repetition loads</li>
              {calculationType === 'racking' && (
                <>
                  <li>• Back-to-back racks with close spacing (&lt;2×thickness) combine loading effects</li>
                  <li>• Typical rack spacings: X=2.4-2.7m longitudinal, Y=0.8-1.2m transverse</li>
                </>
              )}
              {calculationType === 'wheel' && (
                <>
                  <li>• Steel wheels create higher stresses due to concentrated contact</li>
                  <li>• Traffic frequency factor increases design stress for heavy usage</li>
                  <li>• Consider dynamic effects for higher speed operations</li>
                  <li>• Dual/tandem wheels with close spacing (&lt;2×contact dimension) interact as combined loading</li>
                  <li>• Wide spacing between multiple wheels allows independent contact analysis</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConcretePointLoadCalculator;
                