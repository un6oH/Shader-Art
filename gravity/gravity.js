function main() {
  // initialise canvas
  const canvas = document.querySelector("#gl-canvas");
  const gl = canvas.getContext("webgl2");
  if (!gl) { 
    alert("Unable to initialise WebGL"); 
    return; 
  }
  gl.getExtension('EXT_color_buffer_float');
  gl.getExtension('EXT_float_blend');
  gl.getExtension('OES_texture_float_linear');

  //
  // create simulation
  //
  function createSimulation(preset = null) {
    if (preset) {
      let simulation = JSON.parse()
    }

    let simulation = {
      "parameters": {
        "steps": 60, 
        "circleDetail": 12, 
        "maxRadius": 100, 
        "fieldDimensions": [1600, 1600], 
        "canvasDimensions": [800, 800], 
      }, 
      "bodies": [
        {
          "mass": 1, 
          "initialPosition": [0, 0], 
          "initialVelocity": [1, 0], 
          "size": 20, 
          "colour": [255, 0, 0],
        }, 
      ], 
    }; 

    print(JSON.stringify(simulation));

    return simulation;
  }

  const simulation = createSimulation();

  // 
  // initialise programs
  // 
  // update position
  const updatePositionProgram = createProgram(gl, UPDATE_POSITION_VS, UPDATE_POSITION_FS, ["newPosition"])
  gl.useProgram(updatePositionProgram);
  const updatePositionLocations = {
    position: gl.getAttribLocation(updatePositionProgram, "position"), 
    velocity: gl.getAttribLocation(updatePositionProgram, "velocity"), 
    mass: gl.getAttribLocation(updatePositionProgram, mass), 
    canvasDimensions: gl.getUniformLocation(updatePositionProgram, "canvasDimensions"), 
    fieldOffset: gl.getUniformLocation(updatePositionProgram, "fieldOffset"), 
    aoiTexture: gl.getUniformLocation(updatePositionProgram, "aoiTexture"), 
    gravConstant: gl.getUniformLocation(updatePositionProgram, "gravConstant"), 
    deltaTime: gl.getUniformLocation(updatePositionProgram, "deltaTime"), 
  }

  // draw AOIs
  const drawGravityFieldProgram = createProgram(gl, DRAW_GRAVITY_FIELD_VS, DRAW_GRAVITY_FIELD_FS);
  gl.useProgram(drawGravityFieldProgram);
  const drawGravityFieldLocations = {
    vertexPosition: gl.getAttribLocation(drawGravityFieldProgram, "vertexPosition"),
    detail: gl.getUniformLocation(drawGravityFieldProgram, "detail"), 
    canvasDimensions: gl.getUniformLocation(drawGravityFieldProgram, "canvasDimensions"), 
  }

  // display
  const displayProgram = createProgram(gl, DISPLAY_VS, DISPLAY_FS);
  gl.useProgram(displayProgram);
  const displayLocations = {
    position: gl.getAttribLocation(displayProgram, "position"), 
    colour: gl.getAttribLocation(displayProgram, "colour"), 
    canvasDimensions: gl.getUniformLocation(displayProgram, "canvasDimensions"), 
  }

  function setSimulation() {

  }

  function resetSimulation() {

  }

  //
  // simulation functions
  //
  function updatePositions() {

  }

  function drawGravityField() {

  }

  function display() {

  }

  function step() {

  }

  function animate() {

  }

  const subSteps = [];
  function manualStep() {

  }
}

main();