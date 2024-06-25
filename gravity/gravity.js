function main() {
  const canvas = document.querySelector("#gl-canvas");
  const gl = canvas.getContext("webgl2");
  if (!gl) { 
    alert("Unable to initialise WebGL"); 
    return; 
  }
  gl.getExtension('EXT_color_buffer_float');
  gl.getExtension('EXT_float_blend');
  gl.getExtension('OES_texture_float_linear');

  canvas.width = gl.canvas.clientWidth;
  canvas.height = gl.canvas.clientHeight;

  let outputWidth = 1280;
  let outputHeight = 720;

  // parameters
  const params = {
    g: 100,
    distanceUnit: 0.01, 
    coalescenceVelocity: 10, 
    minimumForceMagnitude: 2 ** -16,
  };

  // programs
  const updateFieldsProgram = createProgram(gl, UPDATE_FIELD_VS, UPDATE_FIELD_FS);
  const updateFieldsLocations = createLocations(gl, updateFieldsProgram, ["position", "mass"], ["canvasDimensions", "g", "distanceUnit"]);
  const fieldTexture = createTexture(gl, [gl.LINEAR, gl.LINEAR, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]);
  const fieldFramebuffer = gl.createFramebuffer();

  console.log("creating update position program");
  const updateBodiesProgram = createProgram(gl, UPDATE_POSITION_VS, UPDATE_POSITION_FS, ["o_position", "o_velocity"]);
  const updateBodiesLocations = createLocations(gl, updateBodiesProgram, ["i_position", "i_velocity"], ["field", "g", "deltaTime", "canvasDimensions"]);

  console.log("creating draw bodies program");
  const drawBodiesProgram = createProgram(gl, DRAW_BODIES_VS, DRAW_BODIES_FS);
  const drawBodiesLocations = createLocations(gl, drawBodiesProgram, ["position", "mass"], ["canvasDimensions"]);
  
  console.log("creating display program");
  const displayProgram = createProgram(gl, DISPLAY_VS, DISPLAY_FS);
  const displayLocations = createLocations(gl, displayProgram, ["position"], ["image"]);
  const outputTexture = createTexture(gl);
  const outputFramebuffer = gl.createFramebuffer();

  // body array buffers
  let n = 0;
  const initialBodyPositions = [];
  const initialBodyVelocities = [];
  const bodyMasses = [];

  function createBody(px, py, vx, vy, m) {
    initialBodyPositions.push(px, py);
    initialBodyVelocities.push(vx, vy);
    bodyMasses.push(m);
    ++n;
  }

  function removeBody(i) {
    initialBodyPositions.splice(i * 2, 2);
    initialBodyVelocities.splice(i * 2, 2);
    bodyMasses.splice(i);
    --n;
  }

  // random
  // for (let i = 0; i < 100; ++i) {
  //   createBody(
  //     Math.random() * outputWidth, Math.random() * outputHeight, // position
  //     Math.random() * 100 - 50, Math.random() * 100 - 50, // velocity
  //     Math.random() * 400 + 100 // mass
  //   );
  // }
  // test set
  createBody(outputWidth * 0.25, outputHeight * 0.25, 0, 0, 100);
  createBody(outputWidth * 0.25, outputHeight * 0.75, 0, 0, 200);
  createBody(outputWidth * 0.75, outputHeight * 0.75, 0, 0, 300);
  createBody(outputWidth * 0.75, outputHeight * 0.25, 0, 0, 400);

  const bodyPositionBuffers = [gl.createBuffer(), gl.createBuffer()];
  const bodyVelocityBuffers = [gl.createBuffer(), gl.createBuffer()];
  const bodyMassBuffer = gl.createBuffer();

  // functions
  function initialise() {
    console.log("initialise()");

    /* Array buffers */
    // bodies
    setupBuffer(gl, bodyPositionBuffers[0], new Float32Array(initialBodyPositions), gl.DYNAMIC_DRAW);
    setupBuffer(gl, bodyPositionBuffers[1], new Float32Array(initialBodyPositions), gl.DYNAMIC_DRAW);
    setupBuffer(gl, bodyVelocityBuffers[0], new Float32Array(initialBodyVelocities), gl.DYNAMIC_DRAW);
    setupBuffer(gl, bodyVelocityBuffers[1], new Float32Array(initialBodyVelocities), gl.DYNAMIC_DRAW);
    setupBuffer(gl, bodyMassBuffer, new Float32Array(bodyMasses), gl.STATIC_DRAW);

    // let data = new Float32Array(n * 2);
    // gl.bindBuffer(gl.ARRAY_BUFFER, bodyPositionBuffers[0]);
    // gl.getBufferSubData(gl.ARRAY_BUFFER, 0, data, 0, n * 2);
    // console.log(data);

    /* Textures */
    // output
    gl.bindTexture(gl.TEXTURE_2D, outputTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, outputWidth, outputHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    setupFramebuffer(gl, outputFramebuffer, outputTexture);
    gl.viewport(0, 0, outputWidth, outputHeight);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // field
    gl.bindTexture(gl.TEXTURE_2D, fieldTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, outputWidth, outputHeight, 0, gl.RG, gl.FLOAT, null);
    setupFramebuffer(gl, fieldFramebuffer, fieldTexture);
    gl.viewport(0, 0, outputWidth, outputHeight);
    gl.clearBufferfv(gl.COLOR, 0, [0.0, 0.0, 0.0, 0.0]);

    /* Uniforms */
    gl.useProgram(updateFieldsProgram); gl.uniform2f(updateFieldsLocations.canvasDimensions, outputWidth, outputHeight);
    gl.useProgram(updateBodiesProgram); gl.uniform2f(updateBodiesLocations.canvasDimensions, outputWidth, outputHeight);
    gl.useProgram(drawBodiesProgram); gl.uniform2f(drawBodiesLocations.canvasDimensions, outputWidth, outputHeight);
  }

  // update
  
  let step = 0;

  function updateSet() {
    drawWithTransformFeedback(gl, updateSetTransformFeedback, gl.POINTS, () => { gl.drawArrays(gl.POINTS, 0, n); });
    
  }

  const aoiVertexBuffer = gl.createBuffer();

  const updateFieldsVertexArrays = [
    makeVertexArray(gl, 
      [[bodyPositionBuffers[1], updateFieldsLocations.position, 2, gl.FLOAT], 
      [bodyMassBuffer, updateFieldsLocations.mass, 1, gl.FLOAT],
    ]), 
    makeVertexArray(gl, 
      [[bodyPositionBuffers[0], updateFieldsLocations.position, 2, gl.FLOAT], 
      [bodyMassBuffer, updateFieldsLocations.mass, 1, gl.FLOAT],
    ]), 
  ];

  function updateFields() {
    // console.log("updateFields()");
    gl.useProgram(updateFieldsProgram);

    gl.uniform1f(updateFieldsLocations.g, params.g);
    gl.uniform1f(updateFieldsLocations.distanceUnit, params.distanceUnit);

    gl.bindVertexArray(updateFieldsVertexArrays[step % 2]);

    setFramebuffer(gl, fieldFramebuffer, outputWidth, outputHeight);
    gl.clearBufferfv(gl.COLOR, 0, [0.0, 0.0, 0.0, 0.0]);
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.drawArrays(gl.POINTS, 0, n);
    gl.disable(gl.BLEND);
  }

  const updateBodiesVertexArrays = [
    makeVertexArray(gl, [
      [bodyPositionBuffers[0], updateBodiesLocations.i_position, 2, gl.FLOAT], 
      [bodyVelocityBuffers[0], updateBodiesLocations.i_velocity, 2, gl.FLOAT],
    ]),
    makeVertexArray(gl, [
      [bodyPositionBuffers[1], updateBodiesLocations.i_position, 2, gl.FLOAT], 
      [bodyVelocityBuffers[1], updateBodiesLocations.i_velocity, 2, gl.FLOAT],
    ])
  ];

  const updateBodiesTransformFeedbacks = [
    makeTransformFeedback(gl, [bodyPositionBuffers[1], bodyVelocityBuffers[1]]),
    makeTransformFeedback(gl, [bodyPositionBuffers[0], bodyVelocityBuffers[0]]),
  ];

  function updateBodies(deltaTime) {
    // console.log("updatePositions()");
    gl.useProgram(updateBodiesProgram);

    bindTextureToLocation(gl, updateBodiesLocations.field, 0, fieldTexture);
    gl.uniform1f(updateBodiesLocations.g, params.g);
    gl.uniform1f(updateBodiesLocations.deltaTime, deltaTime);

    gl.bindVertexArray(updateBodiesVertexArrays[step % 2]);
    
    setFramebuffer(gl, null, 0, 0);

    gl.enable(gl.RASTERIZER_DISCARD);
    drawWithTransformFeedback(gl, updateBodiesTransformFeedbacks[step % 2], gl.POINTS, () => { gl.drawArrays(gl.POINTS, 0, n); });
    gl.disable(gl.RASTERIZER_DISCARD);
  }

  function update(deltaTime) {
    console.log("update()");
    updateFields();
    updateBodies(deltaTime);
    ++step;
  }

  // draw bodies
  const drawBodiesVertexArrays = [
    makeVertexArray(gl, [
      [bodyPositionBuffers[0], drawBodiesLocations.position, 2, gl.FLOAT], 
      [bodyMassBuffer, drawBodiesLocations.mass, 1, gl.FLOAT]
    ]), 
    makeVertexArray(gl, [
      [bodyPositionBuffers[1], drawBodiesLocations.position, 2, gl.FLOAT], 
      [bodyMassBuffer, drawBodiesLocations.mass, 1, gl.FLOAT]
    ]),
  ];

  function drawBodies() {
    // console.log("drawBodies()");
    gl.useProgram(drawBodiesProgram);
    
    gl.bindVertexArray(drawBodiesVertexArrays[step % 2]);

    setFramebuffer(gl, outputFramebuffer, outputWidth, outputHeight);
    // setFramebuffer(gl, null, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.drawArrays(gl.POINTS, 0, n);
  }

  // display
  const displayPositionBuffer = makeBuffer(gl, new Float32Array([
    -1, 1, 1, 1, 1, -1, 
    -1, 1, 1, -1, -1, -1,
  ]), gl.STATIC_DRAW);
  
  const displayVertexArray = makeVertexArray(gl, [[displayPositionBuffer, displayLocations.position, 2, gl.FLOAT]]);
  
  function display(print = false) {
    // console.log("display()");
    let width = canvas.width;
    let height = canvas.height;
    if (!print) {
      let clientAspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
      let outputAspect = outputWidth / outputHeight;
      let correctionFactor = clientAspect / outputAspect;
      if (clientAspect < outputAspect) {
        height *= correctionFactor;
      } else {
        width /= correctionFactor;
      }
    }

    gl.useProgram(displayProgram);

    gl.bindVertexArray(displayVertexArray);

    gl.bindTexture(gl.TEXTURE_2D, fieldTexture);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(print ? 0 : (canvas.width - width) * 0.5, print ? 0 : (canvas.height - height) * 0.5, width, height);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  let animate = false;

  function frame() {
    if (!animate) { return; }

    update(1 / 60);
    drawBodies();
    display();

    requestAnimationFrame(frame);
  }

  initialise();
  drawBodies();
  display();

  let i = 0;
  function manualStep() {
    switch(i % 3) {
      case 0:
        console.log("updateFields()");
        updateFields();
        break;
      case 1:
        console.log("updateBodies()");
        updateBodies(1 / 60);
        break;
      case 2:
        console.log("display");
        drawBodies();
        display();
    }
    ++i;
  }

  document.addEventListener("keypress", (event) => {
    if (event.key == ' ') {
      animate = !animate;
      requestAnimationFrame(frame);
    } else if (event.key == 'Enter') {
      manualStep();
    }
  });

  window.onresize = () => { display(false) }; 
}

main();