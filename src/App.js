import React from 'react';
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import ConcretePointLoadCalculator from './components/ConcretePointLoadCalculator';
import './App.css';

function App() {
  return (
    <div className="App">
      <ConcretePointLoadCalculator />
    </div>
  );
}

export default App;
