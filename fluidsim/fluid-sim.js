function main() {
  const canvas = document.getElementById("gl-canvas");
  const gl = canvas.getContext("webgl2");

  canvas.width = gl.canvas.clientWidth;
  canvas.height = gl.canvas.clientHeight;

  gl.getExtension("OES_texture_float_linear");
  gl.getExtension("EXT_color_buffer_float");

  // programs
  console.log("creating advect program");
  const advectProgram = createProgram(gl, VSTexture, FSAdvect);
  const advectLocations = createLocations(gl, advectProgram, ["clipSpace"], ["velocityField", "pressureField", "deltaTime", "dx"]);

  console.log("creating diffuse program"); 
  const diffuseProgram = createProgram(gl, VSDiffuse, FSDiffuse);
  const diffuseLocations = createLocations(gl, diffuseProgram, ["pixel"], ["textureDimensions", "velocityResult", "pressureResult", "velocityField", "pressureField", "deltaTime", "dx"]);

  console.log("creating apply force program");
  const applyForceProgram = createProgram(gl, VSApplyForce, FSApplyForce);
  const applyForceLocations = createLocations(gl, applyForceProgram, ["position"], ["textureDimensions", "splatRadius", "force", "deltaTime"]);

  console.log("creating divergence calc program");
  const divergenceCalcProgram = createProgram(gl, VSDiffuse, FSDivergenceCalc);
  const divergenceCalcLocations = createLocations(gl, divergenceCalcProgram, ["pixel"], ["textureDimensions", "velocityField", "dx"]);

  console.log("creating solve pressure program");
  const solvePressureProgram = createProgram(gl, VSDiffuse, FSSolvePressure);
  const solvePressureLocations = createLocations(gl, solvePressureProgram, ["pixel"], ["textureDimensions", "divergenceResult", "pressureField"]);

  console.log("creating gradient subtract program");
  const gradientSubtractProgram = createProgram(gl, VSDiffuse, FSGradientSubtract);
  const gradientSubtractLocations = createLocations(gl, gradientSubtractProgram, ["pixel"], ["textureDimensions", "velocityField", "pressureField", "dx"]);

  console.log("creating set boundaries program");
  const setBoundariesProgram = createProgram(gl, VSSetBoundaries, FSSetBoundaries);
  const setBoundariesLocations = createLocations(gl, setBoundariesProgram, ["position", "normal"], ["textureDimensions", "velocityField", "pressureField", "px"]);

  console.log("creatin displayProgram");
  const displayProgram = createProgram(gl, VSTexture, FSDisplayTexture);
  const displayLocations = createLocations(gl, displayProgram, ["clipSpace"], ["velocityField", "pressureField", "mode"]);

  function advect() {

  }

  function diffuse() {

  }

  function addForce() {

  }

  function project() {

  }

  function setBoundaries() {

  }
}

main();