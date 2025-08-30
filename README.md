TM38 Concrete Slab on Ground Calculator Documentation
This React application is designed to calculate the required thickness of concrete slabs on ground based on the CCANZ Technical Manual 38 (TM38) methodology. It provides various calculators for different load scenarios, focusing on point loads, rack loads, and wheel loads.

Application Overview
The application offers a user-friendly interface for civil engineers, structural designers, and contractors to determine appropriate concrete slab thicknesses for industrial and commercial floors that are subject to concentrated loads.

Key Features
Multiple Load Scenario Calculators:

Point Load Calculator
Single Line Rack Calculator
Back-to-Back Rack Calculator
Wheel Load Calculator (Single or Dual Wheel)
Interactive Input Parameters:

Subgrade properties (CBR or Scala Penetrometer)
Concrete properties (compressive strength, age)
Joint types and post-tensioning options
Load-specific dimensions and configurations
Advanced Calculations:

Subgrade modulus from CBR or Scala penetrometer readings
Concrete elastic modulus calculation
Stress distribution calculations for different loading conditions
Minimum thickness determination based on allowable stresses
Visual Outputs:

Stress distribution charts
Visual indications of critical design cases
Clear presentation of results for interior, edge, and corner loading
Technical Architecture
Core Calculation Functions
calculateKFromCBR: Calculates subgrade modulus from CBR value
calculateCBRFromScala: Converts Scala penetrometer readings to CBR
calculateModifiedK: Adjusts subgrade modulus based on subbase thickness
calculateEc: Determines concrete elastic modulus from compressive strength
calculateAllowableStress: Calculates allowable concrete stress with fatigue factors
calculateL: Computes radius of relative stiffness
calculateTotalFactoredStress: Calculates factored stress with superposition effects
Optimization Functions
findMinThickness: Iteratively determines minimum slab thickness that satisfies stress criteria
generateStressGraphData: Creates data points for stress distribution charts
UI Components
Main page components (InputParameters, PointLoadCalculator, etc.)
Reusable UI elements (ResultCard, CustomTooltip, StressChart, etc.)
Navigation and control elements
Constants and Design Factors
POISSON_RATIO: 0.15 (concrete Poisson's ratio)
LOAD_FACTOR: 1.5 (safety factor for loads)
Various stress adjustment factors (k1, k2) based on TM38 guidelines
Implementation Details
State Management
The app uses React's useState hooks for managing:

Input parameters (shared across calculators)
Calculator-specific inputs
Calculation results
UI state (loading indicators, page navigation)
Calculation Process
User inputs parameters for soil, concrete, and loading scenario
Upon calculation trigger, the app:
Calculates material properties
Determines stress distributions
Finds minimum thickness that keeps stresses below allowable limits
Identifies critical design case
Displays results with appropriate visualizations
Notable Algorithms
Stress Superposition: Considers effects of adjacent loads using stress influence curves
Iterative Thickness Finding: Incrementally tests increasing thicknesses until stress criteria are met
Interpolation Functions: For stress distribution based on distance-to-radius ratios
Development Notes
Dependencies
React for UI components and state management
Recharts for graphical representation of stress distributions
Lucide React for icons
Future Enhancement Opportunities
Additional Load Cases:

Uniformly distributed loads
Line loads
Custom load configurations
Advanced Features:

Export calculations to PDF
Save/load configurations
Batch calculations for multiple scenarios
Technical Improvements:

Server-side calculations for more complex scenarios
Performance optimizations for stress interpolation
3D visualization of stress distributions
Validation Enhancements:

Add checks for punching shear (currently noted in disclaimer)
Incorporate bearing capacity checks
Validate against real-world test data
Limitations and Considerations
The calculator does not check for punching shear or bearing capacity as noted in the disclaimer.
The methodology is based on the CCANZ TM38, which uses elastic analysis principles.
Results should be verified by qualified engineers before implementation.
Some advanced loading cases may require more detailed finite element analysis.
Credits
Based on the CCANZ Technical Manual 38 methodology for the design of concrete slabs on ground under concentrated loads.