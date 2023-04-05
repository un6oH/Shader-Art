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
  const positions = new Float32Array();
  const velocities = new Float32Array();
  const masses = new Float32Array();
  function createSimulation(preset = null) {
    if (preset) {
      let simulation = JSON.parse()
    }

    let width = gl.canvas.clientWidth;
    let height = gl.canvas.clientHeight; 

    let simulation = {
      "parameters": {
        "gravConstant": 1, 
        "steps": 60, 
        "circleDetail": 12, 
        "maxRadius": 100, 
        "fieldDimensions": [width * 2, height * 2], 
        "canvasDimensions": [width, height], 
      }, 
      "bodies": [
        {
          "mass": 1, 
          "position": [0, 0], 
          "velocity": [1, 0], 
          "size": 20, 
          "colour": [255, 0, 0],
        }, 
        {
          "mass": 1, 
          "position": [50, 0], 
          "velocity": [-1, -1], 
          "size": 20, 
          "colour": [255, 0, 0],
        }, 
      ],
    }; 

    console.log(JSON.stringify(simulation));

    return simulation;
  }

  const simulation = createSimulation();

  // 
  // initialise programs
  // 
  // update position program
  const updatePositionProgram = createProgram(gl, UPDATE_POSITION_VS, UPDATE_POSITION_FS, ["newPosition", "newVelocity"]);
  gl.useProgram(updatePositionProgram);
  const updatePositionLocations = {
    position: gl.getAttribLocation(updatePositionProgram, "position"), 
    velocity: gl.getAttribLocation(updatePositionProgram, "velocity"), 
    mass: gl.getAttribLocation(updatePositionProgram, "mass"), 
    canvasDimensions: gl.getUniformLocation(updatePositionProgram, "canvasDimensions"), 
    fieldOffset: gl.getUniformLocation(updatePositionProgram, "fieldOffset"), 
    gravityFieldTexture: gl.getUniformLocation(updatePositionProgram, "gravityFieldTexture"), 
    gravConstant: gl.getUniformLocation(updatePositionProgram, "gravConstant"), 
    deltaTime: gl.getUniformLocation(updatePositionProgram, "deltaTime"), 
  }
  const position1Buffer = gl.createBuffer();
  const position2Buffer = gl.createBuffer();
  const velocity1Buffer = gl.createBuffer();
  const velocity2Buffer = gl.createBuffer();
  const massBuffer = gl.createBuffer();
  
  const updatePositionVertexArray1 = makeVertexArray(gl, [
    [position1Buffer, updatePositionLocations.position, 2, gl.FLOAT], 
    [velocity1Buffer, updatePositionLocations.velocity, 2, gl.FLOAT], 
    [massBuffer, updatePositionLocations.mass, 1, gl.FLOAT], 
  ]);
  const updatePositionVertexArray2 = makeVertexArray(gl, [
    [position2Buffer, updatePositionLocations.position, 2, gl.FLOAT], 
    [velocity2Buffer, updatePositionLocations.velocity, 2, gl.FLOAT], 
    [massBuffer, updatePositionLocations.mass, 1, gl.FLOAT], 
  ]);
  
  const updatePositionTransformFeedback1 = makeTransformFeedback(gl, [position2Buffer, velocity2Buffer]);
  const updatePositionTransformFeedback2 = makeTransformFeedback(gl, [position1Buffer, velocity1Buffer]);
  
  gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  
  let current = {
    vertexArray: updatePositionVertexArray1, 
    transformFeedback: updatePositionTransformFeedback1, 
    outputPositionBuffer: position2Buffer,
    outputVelocityBuffer: velocity2Buffer, 
  };
  let next = {
    vertexArray: updatePositionVertexArray2, 
    transformFeedback: updatePositionTransformFeedback2, 
    outputPositionBuffer: position1Buffer,
    outputVelocityBuffer: velocity1Buffer, 
  };

  // draw gravity field program
  const drawGravityFieldProgram = createProgram(gl, DRAW_GRAVITY_FIELD_VS, DRAW_GRAVITY_FIELD_FS);
  gl.useProgram(drawGravityFieldProgram);
  const drawGravityFieldLocations = {
    vertexPosition: gl.getAttribLocation(drawGravityFieldProgram, "vertexPosition"),
    canvasDimensions: gl.getUniformLocation(drawGravityFieldProgram, "canvasDimensions"), 
    detail: gl.getUniformLocation(drawGravityFieldProgram, "detail"), 
    aoiRadius: gl.getUniformLocation(drawGravityFieldProgram, "aoiRadius"), 
  }
  const aoiVertexBuffer = gl.createBuffer();
  const gravityFieldTexture = createTexture(gl);
  const gravityFieldFrameBuffer = createFramebuffer(gl, gravityFieldTexture);

  // render programs
  // circles
  const renderCirclesProgram = createProgram(gl, RENDER_CIRCLES_VS, RENDER_CIRCLES_FS);
  gl.useProgram(renderCirclesProgram);
  const renderCirclesLocations = {
    position: gl.getAttribLocation(renderCirclesProgram, "position"), 
    colour: gl.getAttribLocation(renderCirclesProgram, "colour"), 
    canvasDimensions: gl.getUniformLocation(renderCirclesProgram, "canvasDimensions"), 
  }

  // spheres
  // code for rendering spheres
  

  // display program;
  const displayProgram = createProgram(gl, DISPLAY_VS, DISPLAY_FS);
  const displayLocations = {
    position: gl.getAttribLocation(displayProgram, "position"), 
    canvasDimensions: gl.getUniformLocation(displayProgram, "canvasDimensions"), 
  }
  const outputTexture = createTexture(gl);
  const outputFramebuffer = createFramebuffer(gl, outputTexture);

  //
  // set simulation
  //
  function setSimulation() {
    // update positions
    simulation.n = simulation.bodies.length;
    simulation.positions = new Float32Array(simulation.n * 2);
    simulation.velocities = new Float32Array(simulation.n * 2);
    simulation.masses = new Float32Array(simulation.n);

    simulation.bodies.forEach((body, i) => {
      let x = i * 2;
      let y = x + 1;

      simulation.positions[x] = body.position[0];
      simulation.positions[y] = body.position[1];

      simulation.velocities[x] = body.velocity[0];
      simulation.velocities[y] = body.velocity[1];

      simulation.masses[i] = body.mass;
    })
    console.log("setSimulation() initial positions", simulation.positions);
    console.log("setSimulation() initial velocities", simulation.velocities);
    console.log("setSimulation() initial masses", simulation.masses);

    gl.bindBuffer(gl.ARRAY_BUFFER, position1Buffer); gl.bufferData(gl.ARRAY_BUFFER, simulation.positions, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, position2Buffer); gl.bufferData(gl.ARRAY_BUFFER, simulation.positions, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, velocity1Buffer); gl.bufferData(gl.ARRAY_BUFFER, simulation.velocities, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, velocity2Buffer); gl.bufferData(gl.ARRAY_BUFFER, simulation.velocities, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, massBuffer);      gl.bufferData(gl.ARRAY_BUFFER, simulation.masses, gl.STATIC_DRAW);

    gl.useProgram(updatePositionProgram);
    gl.uniform2f(updatePositionLocations.canvasDimensions, ...simulation.parameters.canvasDimensions);
    gl.uniform2f(updatePositionLocations.fieldOffset, 
      (simulation.parameters.fieldDimensions[0] - simulation.parameters.canvasDimensions[0]) / 2, 
      (simulation.parameters.fieldDimensions[1] - simulation.parameters.canvasDimensions[1]) / 2);

    // gravity field
    gl.bindTexture(gl.TEXTURE_2D, gravityFieldTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, ...simulation.parameters.fieldDimensions, 0, gl.RGBA, gl.FLOAT, null);

    // output
    gl.bindTexture(gl.TEXTURE_2D, outputTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, ...simulation.parameters.canvasDimensions, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  }

  setSimulation();

  function resetSimulation() {

  }

  //
  // simulation functions
  //
  function updatePositions(deltaTime) {
    gl.useProgram(updatePositionProgram);

    gl.bindVertexArray(current.vertexArray);
    gl.uniform1f(updatePositionLocations.gravConstant, simulation.parameters.gravConstant);
    gl.uniform1f(updatePositionLocations.deltaTime, deltaTime);

    gl.bindTexture(gl.TEXTURE_2D, gravityFieldTexture);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.enable(gl.RASTERIZER_DISCARD);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, current.transformFeedback);
    gl.beginTransformFeedback(gl.POINTS);

    gl.drawArrays(gl.POINTS, 0, simulation.n);

    gl.endTransformFeedback();
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
    gl.disable(gl.RASTERIZER_DISCARD);

    gl.bindBuffer(gl.ARRAY_BUFFER, current.outputPositionBuffer);
    gl.getBufferSubData(gl.ARRAY_BUFFER, 0, simulation.positions);
    gl.bindBuffer(gl.ARRAY_BUFFER, current.outputVelocityBuffer);
    gl.getBufferSubData(gl.ARRAY_BUFFER, 0, simulation.velocities);

    let temp = current;
    current = next;
    next = temp;

    console.log("updatePositions() new positions: ", simulation.positions);
  }

  function drawGravityField() {

  }

  function render() {

  }

  function display() {

  }

  function step() {

  }

  function animate() {

  }

  const subSteps = [];
  function manualStep() {
    updatePositions(1);
  }
  document.addEventListener("click", manualStep);
}


main();