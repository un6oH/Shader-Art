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

  /** parameters */
  const params = {
    n: 100, 
    maxAcc: 10, 
    minSpeed: 20, 
    maxSpeed: 40, 
    separationF: 1, 
    alignmentF: 0.5, 
    cohesionF: 0.5, 
    aoiRadius: 50, 
    boidSize: 10, 
  };

  const resetButton = document.querySelector("#reset");

  const inputs = {
    n: document.querySelector("#n"),
    maxAcc: document.querySelector("#maxAcc"),
    minSpeed: document.querySelector("#minSpeed"),
    maxSpeed: document.querySelector("#maxSpeed"),
    separationF: document.querySelector("#separationF"),
    alignmentF: document.querySelector("#alignmentF"),
    cohesionF: document.querySelector("#cohesionF"),
    aoiRadius: document.querySelector("#aoiRadius"),
  };

  const outputs = {
    separationF: document.querySelector("#separationFValue"), 
    alignmentF: document.querySelector("#alignmentFValue"), 
    cohesionF: document.querySelector("#cohesionFValue"), 
  };

  ["separationF", "alignmentF", "cohesionF"].forEach((id) => {
    outputs[id].textContent = inputs[id].value;
    inputs[id].addEventListener("input", (event) => {
      outputs[id].textContent = event.target.value;
    });
  })

  resetButton.addEventListener("click", () => setSimulation());

  function setParams() {
    for (let input in inputs) {
      params[input] = parseFloat(inputs[input].value);
    }
    console.log("setParams()")
    console.log(params);
  }
  setParams();

  // constants
  const aoiTextureWidth = 400;
  const aoiTextureHeight = Math.floor(aoiTextureWidth * canvas.height / canvas.width);

  /** initialise programs */
  // update velocity program
  console.log("Creating update position program");
  const updatePositionProgram = createProgram(gl, UPDATE_POSITION_VS, UPDATE_POSITION_FS, ["newVelocity", "newPosition"]);
  gl.useProgram(updatePositionProgram);
  const updatePositionLocations = {
    velocity: gl.getAttribLocation(updatePositionProgram, "velocity"),
    position: gl.getAttribLocation(updatePositionProgram, "position"),
    displacementAoiTexture: gl.getUniformLocation(updatePositionProgram, "displacementAoiTexture"), 
    velocityAoiTexture: gl.getUniformLocation(updatePositionProgram, "velocityAoiTexture"), 
    positionAoiTexture: gl.getUniformLocation(updatePositionProgram, "positionAoiTexture"), 
    deltaTime: gl.getUniformLocation(updatePositionProgram, "deltaTime"), 
    maxAcc: gl.getUniformLocation(updatePositionProgram, "maxAcc"), 
    minSpeed: gl.getUniformLocation(updatePositionProgram, "minSpeed"), 
    maxSpeed: gl.getUniformLocation(updatePositionProgram, "maxSpeed"), 
    separationF: gl.getUniformLocation(updatePositionProgram, "separationF"), 
    alignmentF: gl.getUniformLocation(updatePositionProgram, "alignmentF"), 
    cohesionF: gl.getUniformLocation(updatePositionProgram, "cohesionF"), 
    aoiRadius: gl.getUniformLocation(updatePositionProgram, "aoiRadius"), 
    canvasDimensions: gl.getUniformLocation(updatePositionProgram, "canvasDimensions"), 
  };
  gl.uniform1i(updatePositionLocations.displacementAoiTexture, 0);
  gl.uniform1i(updatePositionLocations.velocityAoiTexture, 1);
  gl.uniform1i(updatePositionLocations.positionAoiTexture, 2);

  // draw displacement aoi program
  console.log("Creating draw displacement aoi program");
  const drawDisplacementAoiProgram = createProgram(gl, DRAW_DISPLACEMENT_AOI_VS, DRAW_DISPLACEMENT_AOI_FS)
  gl.useProgram(drawDisplacementAoiProgram);
  const drawDisplacementAoiLocations = {
    vertex: gl.getAttribLocation(drawDisplacementAoiProgram, "vertex"), 
    detail: gl.getUniformLocation(drawDisplacementAoiProgram, "detail"), 
    canvasDimensions: gl.getUniformLocation(drawDisplacementAoiProgram, "canvasDimensions"),
  }

  const displacementAoiTexture = createTexture(gl);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, aoiTextureWidth, aoiTextureHeight, 0, gl.RGBA, gl.FLOAT, null);
  const displacementAoiFramebuffer = createFramebuffer(gl, displacementAoiTexture);
  
  // draw velocity aoi program
  console.log("Creating draw velocity aoi program");
  const drawVelocityAoiProgram = createProgram(gl, DRAW_VELOCITY_AOI_VS, DRAW_VELOCITY_AOI_FS);
  gl.useProgram(drawVelocityAoiProgram);
  const drawVelocityAoiLocations = {
    vertex: gl.getAttribLocation(drawVelocityAoiProgram, "vertex"), 
    velocity: gl.getUniformLocation(drawVelocityAoiProgram, "velocity"), 
    canvasDimensions: gl.getUniformLocation(drawVelocityAoiProgram, "canvasDimensions"),   
  }
  
  const velocityAoiTexture = createTexture(gl);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, aoiTextureWidth, aoiTextureHeight, 0, gl.RGBA, gl.FLOAT, null);
  const velocityAoiFramebuffer = createFramebuffer(gl, velocityAoiTexture);
  
  // draw position aoi program
  console.log("Creating draw position aoi program");
  const drawPositionAoiProgram = createProgram(gl, DRAW_POSITION_AOI_VS, DRAW_POSITION_AOI_FS);
  gl.useProgram(drawPositionAoiProgram);
  const drawPositionAoiLocations = {
    vertex: gl.getAttribLocation(drawPositionAoiProgram, "vertex"), 
    centre: gl.getUniformLocation(drawPositionAoiProgram, "centre"), 
    canvasDimensions: gl.getUniformLocation(drawPositionAoiProgram, "canvasDimensions"),   
  }
  
  const positionAoiTexture = createTexture(gl);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, aoiTextureWidth, aoiTextureHeight, 0, gl.RGBA, gl.FLOAT, null);
  const positionAoiFramebuffer = createFramebuffer(gl, positionAoiTexture);

  // drawBoids program
  console.log("Creating draw boids program");
  const drawBoidsProgram = createProgram(gl, DRAW_BOIDS_VS, DRAW_BOIDS_FS);
  gl.useProgram(drawBoidsProgram);
  const drawBoidsLocations = {
    vertex: gl.getAttribLocation(drawBoidsProgram, "vertex"), 
    colour: gl.getAttribLocation(drawBoidsProgram, "colour"), 
    canvasDimensions: gl.getUniformLocation(drawBoidsProgram, "canvasDimensions"),  
  }

  // draw textures program
  console.log("Creating draw texture program");
  const drawTexturesProgram = createProgram(gl, DRAW_TEXTURE_VS, DRAW_TEXTURE_FS);
  gl.useProgram(drawTexturesProgram);
  const drawTexturesLocations = {
    texture: gl.getUniformLocation(drawTexturesProgram, "u_texture"), 
    canvasDimensions: gl.getUniformLocation(drawTexturesProgram, "canvasDimensions"), 
  }
  gl.uniform1i(drawTexturesLocations.texture, 0);

  /** initialisation */
  let initPositions, initVelocities, speeds, positions, velocities;
  let boidVertices, boidColours, boidSize;
  function setVariables() {
    // canvas size
    canvas.width = gl.canvas.clientWidth;
    canvas.height = gl.canvas.clientHeight;
    console.log("setVariables() drawing to " + canvas.width + "," + canvas.height + " canvas");

    gl.useProgram(updatePositionProgram); gl.uniform2f(updatePositionLocations.canvasDimensions, canvas.width, canvas.height);
    gl.useProgram(drawDisplacementAoiProgram); gl.uniform2f(drawDisplacementAoiLocations.canvasDimensions, canvas.width, canvas.height);
    gl.useProgram(drawVelocityAoiProgram); gl.uniform2f(drawVelocityAoiLocations.canvasDimensions, canvas.width, canvas.height);
    gl.useProgram(drawPositionAoiProgram); gl.uniform2f(drawPositionAoiLocations.canvasDimensions, canvas.width, canvas.height);
    gl.useProgram(drawBoidsProgram); gl.uniform2f(drawBoidsLocations.canvasDimensions, canvas.width, canvas.height);
    gl.useProgram(drawTexturesProgram); gl.uniform2f(drawTexturesLocations.canvasDimensions, canvas.width, canvas.height);

    // boid properties
    initPositions = new Array(params.n).fill(0).map(() => [canvas.width * Math.random(), canvas.height * Math.random()]).flat();
    speeds = new Array(params.n).fill(0).map(() => Math.random() * (params.maxSpeed - params.minSpeed) + params.minSpeed);
    initVelocities = new Array(params.n).fill(0).map(() => Math.PI * 2 * Math.random()).map((angle) => [Math.cos(angle), Math.sin(angle)]).flat().map((x, i) => x * speeds[Math.floor(i / 2)]);
    positions = new Float32Array(initPositions);
    velocities = new Float32Array(initVelocities);

    // boid display properties
    boidSize = canvas.width * 0.01;
    boidPoints = [
      boidSize, 0, 
      boidSize, boidSize / 2, 
      boidSize, boidSize / 2, 
    ];
    boidVertices = new Array(params.n * boidPoints.length);
    boidColours = new Array(params.n * boidPoints.length * 1.5).fill(0).map(() => [Math.random(), Math.random(), Math.random()]).flat();
  }
  setVariables();
  
  /** set area of influence */
  const aoiVertexBuffer = gl.createBuffer();
  
  const circleDetail = 12;
  const angleInc = Math.PI * 2 / circleDetail;

  const drawDisplacementAoiVertexArray = makeVertexArray(gl, [[aoiVertexBuffer, drawDisplacementAoiLocations.vertex, 2, gl.FLOAT]]);
  const drawVelocityAoiVertexArray = makeVertexArray(gl, [[aoiVertexBuffer, drawVelocityAoiLocations.vertex, 2, gl.FLOAT]]);
  const drawPositionAoiVertexArray = makeVertexArray(gl, [[aoiVertexBuffer, drawPositionAoiLocations.vertex, 2, gl.FLOAT]]);

  function drawAoi() {
    const circlePoints = new Array(circleDetail + 1).fill(0).map(
      (x, i) => angleInc * i).map(
        (a) => [Math.cos(a) * params.aoiRadius, Math.sin(a) * params.aoiRadius]).flat();

    // vertices for centre and points on the circumference
    let circleVertices = new Array(params.n * circleDetail * 3 * 2);

    for(let c = 0; c < params.n; ++c) { // circle c of n
      let i = c * circleDetail * 3 * 2; // index of circle centre x
      for(let s = 0; s < circleDetail; ++s) { // sector s of detail
        let j = i + s * 3 * 2;
        
        let cx = positions[c * 2];
        let cy = positions[c * 2 + 1];
        circleVertices[j] = cx;
        circleVertices[j + 1] = cy;

        let p1 = s * 2; // index of point on circumference
        let p2 = s * 2 + 2;
        circleVertices[j + 2] = cx + circlePoints[p1];
        circleVertices[j + 3] = cy + circlePoints[p1 + 1];
        circleVertices[j + 4] = cx + circlePoints[p2];
        circleVertices[j + 5] = cy + circlePoints[p2 + 1];
      }
    }

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.blendEquationSeparate(gl.FUNC_ADD, gl.MAX);

    /** draw displacement aoi */
    gl.useProgram(drawDisplacementAoiProgram);
    
    gl.bindVertexArray(drawDisplacementAoiVertexArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, aoiVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(circleVertices), gl.STATIC_DRAW);
    gl.uniform1i(drawDisplacementAoiLocations.detail, circleDetail);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, displacementAoiFramebuffer);
    gl.viewport(0, 0, aoiTextureWidth, aoiTextureHeight);
    gl.clearBufferfv(gl.COLOR, 0, new Float32Array([0, 0, 0, 1]));

    gl.drawArrays(gl.TRIANGLES, 0, params.n * circleDetail * 3);
    
    /** draw velocity aoi */
    gl.useProgram(drawVelocityAoiProgram);
    
    gl.bindVertexArray(drawVelocityAoiVertexArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, aoiVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(circleVertices), gl.STATIC_DRAW);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, velocityAoiFramebuffer);
    gl.viewport(0, 0, aoiTextureWidth, aoiTextureHeight);
    gl.clearBufferfv(gl.COLOR, 0, new Float32Array([0, 0, 0, 1]));

    // draw elements for each circle
    for (let c = 0; c < params.n; ++c) {
      gl.uniform2f(drawVelocityAoiLocations.velocity, velocities[c * 2], velocities[c * 2 + 1]);
      
      gl.drawArrays(gl.TRIANGLES, c * circleDetail * 3, circleDetail * 3);
    }

    /** draw position aoi */
    gl.useProgram(drawPositionAoiProgram);

    gl.bindVertexArray(drawPositionAoiVertexArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, aoiVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(circleVertices), gl.STATIC_DRAW);

    gl.bindFramebuffer(gl.FRAMEBUFFER, positionAoiFramebuffer);
    gl.viewport(0, 0, aoiTextureWidth, aoiTextureHeight);
    gl.clearBufferfv(gl.COLOR, 0, new Float32Array([0, 0, 0, 1]));

    for (let c = 0; c < params.n; ++c) {
      gl.uniform2f(drawPositionAoiLocations.centre, positions[c * 2], positions[c * 2 + 1]);
      
      gl.drawArrays(gl.TRIANGLES, c * circleDetail * 3, circleDetail * 3);
    }
    
    // disable blending
    gl.disable(gl.BLEND);
  }

  /** update positions */
  const velocity1Buffer = makeBuffer(gl, velocities, gl.STATIC_DRAW);
  const position1Buffer = makeBuffer(gl, positions, gl.STATIC_DRAW);
  const velocity2Buffer = makeBuffer(gl, velocities, gl.STATIC_DRAW);
  const position2Buffer = makeBuffer(gl, positions, gl.STATIC_DRAW);
  
  const updatePositionVertexArray1 = makeVertexArray(gl, [
    [velocity1Buffer, updatePositionLocations.velocity, 2, gl.FLOAT], 
    [position1Buffer, updatePositionLocations.position, 2, gl.FLOAT], 
  ]);
  const updatePositionVertexArray2 = makeVertexArray(gl, [
    [velocity2Buffer, updatePositionLocations.velocity, 2, gl.FLOAT], 
    [position2Buffer, updatePositionLocations.position, 2, gl.FLOAT], 
  ]);

  const updatePositionTransformFeedback1 = makeTransformFeedback(gl, [velocity2Buffer, position2Buffer]);
  const updatePositionTransformFeedback2 = makeTransformFeedback(gl, [velocity1Buffer, position1Buffer]);

  gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  let current = {
    vertexArray: updatePositionVertexArray1, 
    transformFeedback: updatePositionTransformFeedback1, 
    outputVelocityBuffer: velocity2Buffer, 
    outputPositionBuffer: position2Buffer,
  };
  let next = {
    vertexArray: updatePositionVertexArray2, 
    transformFeedback: updatePositionTransformFeedback2, 
    outputVelocityBuffer: velocity1Buffer, 
    outputPositionBuffer: position1Buffer,
  };

  function updateBoids(deltaTime) {
    gl.useProgram(updatePositionProgram);

    // set data
    gl.bindVertexArray(current.vertexArray);
    gl.uniform1f(updatePositionLocations.deltaTime, deltaTime);
    gl.uniform1f(updatePositionLocations.maxAcc, params.maxAcc);
    gl.uniform1f(updatePositionLocations.minSpeed, params.minSpeed);
    gl.uniform1f(updatePositionLocations.maxSpeed, params.maxSpeed);
    gl.uniform1f(updatePositionLocations.separationF, params.separationF);
    gl.uniform1f(updatePositionLocations.alignmentF, params.alignmentF);
    gl.uniform1f(updatePositionLocations.cohesionF, params.cohesionF);
    gl.uniform1f(updatePositionLocations.aoiRadius, params.aoiRadius);

    // bind textures
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, displacementAoiTexture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, velocityAoiTexture);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, positionAoiTexture);

    // framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    
    // draw arrays
    gl.enable(gl.RASTERIZER_DISCARD);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, current.transformFeedback);
    gl.beginTransformFeedback(gl.POINTS);
    
    gl.drawArrays(gl.POINTS, 0, params.n);
    
    gl.endTransformFeedback();
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
    gl.disable(gl.RASTERIZER_DISCARD);

    // read buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, current.outputVelocityBuffer);
    gl.getBufferSubData(gl.ARRAY_BUFFER, 0, velocities);
    gl.bindBuffer(gl.ARRAY_BUFFER, current.outputPositionBuffer);
    gl.getBufferSubData(gl.ARRAY_BUFFER, 0, positions);

    let temp = current;
    current = next;
    next = temp;
  }

  /** draw boids */
  const boidVertexBuffer = gl.createBuffer();
  const boidColourBuffer = gl.createBuffer();

  const boidVertexArray = makeVertexArray(gl, [
    [boidVertexBuffer, drawBoidsLocations.position, 2, gl.FLOAT], 
    [boidColourBuffer, drawBoidsLocations.colour, 3, gl.FLOAT], 
  ]);
  
  function drawBoids() {
    for (let b = 0; b < params.n; ++b) { // boid b of n
      let i = b * 2;
      let px = positions[i];
      let py = positions[i + 1];
      let vx = velocities[i];
      let vy = velocities[i + 1];

      let k = b * boidPoints.length; // index of first x coordinate within boidVertices
      for (let j = 0; j < boidPoints.length; j += 2) { // vertex j of 3
        let v = [boidPoints[j], boidPoints[j + 1], 0];
        let u = Vec3.normalise([vx, vy, 0]);
        let v2 = [
          v[0]*u[0] - v[1]*u[1], 
          v[0]*u[1] + v[1]*u[0], 
        ];

        boidVertices[k + j] = px + v2[0];
        boidVertices[k + j + 1] = py + v2[1];
      }
    }

    gl.useProgram(drawBoidsProgram);

    gl.bindVertexArray(boidVertexArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, boidVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(boidVertices), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, boidColourBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(boidColours), gl.STATIC_DRAW);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.drawArrays(gl.TRIANGLES, 0, params.n * boidPoints.length * 0.5);
  }

  function drawTexture(texture) {
    gl.useProgram(drawTexturesProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.drawArrays(gl.POINTS, 0, 1);
  }

  // simulation functions
  function setSimulation() {
    setParams();
    setVariables();
    step(0);
  }
  step(0);

  function step(deltaTime) {
    console.log("step");
    drawAoi();
    updateBoids(deltaTime);
    drawBoids();
    // console.log(velocities);
    // console.log(velocities.filter(x => isNaN(x)))
    // drawTexture(displacementAoiTexture);
  }

  

  let then = 0
  function loop(time) {
    if (!play) {
      return;
    }
    let deltaTime = time - then;
    then = time;
    step(0.05);
    requestAnimationFrame(loop);
  }
  // requestAnimationFrame(loop);

  function keyPress(event) {
    if (event.key == ' ') {
      playPause();
    }
  }

  let play = false;
  function playPause(time) {
    play = !play;
    if (play) {
      then = time;
      loop(time);
    }
  }

  document.addEventListener("keypress", playPause);

  let i = 0;
  const steps = [
    () => {
      step(0.05);
      console.log(positions);
      console.log(velocities);
      console.log(boidVertices);
    },
  ];

  function manualStep() {
    steps[i % steps.length]();
    ++i;
  }

  canvas.addEventListener("click", manualStep);
}

function createShader(gl, type, source) {
  let shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  let success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) { return shader; }

  console.log("Error from " + (type == gl.VERTEX_SHADER ? "vertex shader " : "fragment shader ") + gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
}

function createProgram(gl, vertexShaderSource, fragmentShaderSource, transformFeedbackVaryings = null) {
  let vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  let fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  
  let program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);

  if (transformFeedbackVaryings) {
    gl.transformFeedbackVaryings(program, transformFeedbackVaryings, gl.SEPARATE_ATTRIBS);
  }

  gl.linkProgram(program);
  let success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) { return program; }

  console.log(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
}

function createTexture(gl) {
  let texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  return texture;
}

function createFramebuffer(gl, texture) {
  let framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  return framebuffer;
}

function makeBuffer(gl, data, usage) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, usage);
  return buffer;
}

function makeVertexArray(gl, buffers) {
  const vertexArray = gl.createVertexArray();
  gl.bindVertexArray(vertexArray);
  for (let [buffer, location, size, type] of buffers) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, type, false, 0, 0);
  }
  return vertexArray;
}

function makeTransformFeedback(gl, buffers) {
  const transformFeedback = gl.createTransformFeedback();
  gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, transformFeedback);
  buffers.forEach((buffer, index) => {
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, index, buffer);
  });
  return transformFeedback;
}

main();