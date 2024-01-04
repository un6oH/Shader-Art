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
    width: 1920, 
    height: 1080, 
    n: 100, 
    maxAcc: 10, 
    minSpeed: 20, 
    maxSpeed: 40, 
    separationF: 1, 
    alignmentF: 0.5, 
    cohesionF: 0.5, 
    aoiRadius: 50, 
    boidSize: 10, 
    trailLength: 0, 
  };

  const resetButton = document.querySelector("#reset");
  const screenshotButton = document.querySelector("#screenshot");
  const inputs = {
    width: document.querySelector("#width"), 
    height: document.querySelector("#height"), 
    n: document.querySelector("#n"),
    maxAcc: document.querySelector("#maxAcc"),
    minSpeed: document.querySelector("#minSpeed"),
    maxSpeed: document.querySelector("#maxSpeed"),
    separationF: document.querySelector("#separationF"),
    alignmentF: document.querySelector("#alignmentF"),
    cohesionF: document.querySelector("#cohesionF"),
    aoiRadius: document.querySelector("#aoiRadius"),
    boidSize: document.querySelector("#boidSize"), 
    trailLength: document.querySelector("#trailLength"),
  };
  const spriteSelector = document.querySelector("#sprite");
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
  });

  resetButton.addEventListener("click", setSimulation);
  screenshotButton.addEventListener("click", screenshot);

  const parameterContainer = document.querySelector("#parameter-container");
  function setParams() {
    for (let input in inputs) {
      params[input] = parseFloat(inputs[input].value);
    }
    params.sprite = spriteSelector.value;
    console.log("setParams() params: ", params);
  }
  setParams();

  ["maxAcc", "minSpeed", "maxSpeed", "separationF", "alignmentF", "cohesionF", "aoiRadius", "trailLength"].forEach(input => inputs[input].addEventListener('input', () => {
    params[input] = parseFloat(inputs[input].value);
  }));

  // constants
  let aoiTextureWidth = params.width / 8;
  let aoiTextureHeight = Math.floor(aoiTextureWidth * params.height / params.width);

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
  const positionAoiFramebuffer = createFramebuffer(gl, positionAoiTexture);

  // drawBoids program
  console.log("Creating draw boids program");
  const drawBoidsProgram = createProgram(gl, DRAW_BOIDS_VS, DRAW_BOIDS_FS);
  gl.useProgram(drawBoidsProgram);
  const drawBoidsLocations = {
    position: gl.getAttribLocation(drawBoidsProgram, "position"), 
    colour: gl.getAttribLocation(drawBoidsProgram, "colour"), 
    canvasDimensions: gl.getUniformLocation(drawBoidsProgram, "canvasDimensions"),  
  }
  const outputTexture = createTexture(gl);
  const outputFramebuffer = createFramebuffer(gl, outputTexture);

  // draw textures program
  console.log("Creating draw texture program");
  const drawTexturesProgram = createProgram(gl, DRAW_TEXTURE_VS, DRAW_TEXTURE_FS);
  gl.useProgram(drawTexturesProgram);
  const drawTexturesLocations = {
    position: gl.getAttribLocation(drawTexturesProgram, "position"), 
    texture: gl.getUniformLocation(drawTexturesProgram, "u_texture"), 
    canvasDimensions: gl.getUniformLocation(drawTexturesProgram, "canvasDimensions"), 
  }
  gl.uniform1i(drawTexturesLocations.texture, 0);

  // clear canvas program
  console.log("Creating clear canvas program");
  const clearCanvasProgram = createProgram(gl, CLEAR_CANVAS_VS, CLEAR_CANVAS_FS);
  gl.useProgram(clearCanvasProgram);
  const clearCanvasLocations = {
    position: gl.getAttribLocation(clearCanvasProgram, "position"), 
    canvasWidth: gl.getUniformLocation(clearCanvasProgram, "canvasWidth"),
    clearColour: gl.getUniformLocation(clearCanvasProgram, "clearColour"),
  }

  // unit circle array
  const circleDetail = 16;
  const angleInc = Math.PI * 2 / circleDetail;
  
  const unitCircle = new Array(circleDetail + 1).fill(0).map((x, i) => angleInc * i).map((a) => [Math.cos(a), Math.sin(a)]).flat();
  
  // boid properties
  const boids = {};

  const velocity1Buffer = gl.createBuffer();
  const position1Buffer = gl.createBuffer();
  const velocity2Buffer = gl.createBuffer();
  const position2Buffer = gl.createBuffer();

  const boidColourBuffer = gl.createBuffer();
  const boidVertexBuffer = gl.createBuffer();
  const boidIndexBuffer = gl.createBuffer();

  // boid sprites
  const spriteVertices = {
    wedge: [
      0.5, 0, 
      -0.3, -0.25,
      -0.5, -0.25, 
      -0.5, 0.25, 
      -0.3, 0.25, 
    ], 
    circle: [
      0, 0, 
      ...unitCircle.map((v) => v * 0.5)
    ]
  };
  spriteVertices.circle.splice(34, 2);

  const spriteIndices = {
    wedge: [
      0, 1, 4, 
      1, 2, 3, 
      1, 3, 4, 
    ], 
    circle: new Array(circleDetail).fill(0).map((v, i) => [0, i + 1, i + 2]).flat().flat(), 
  };
  spriteIndices.circle[circleDetail * 3 - 1] = 1;

  const spriteColourFunctions = {
    wedgeWhite: () => new Array(5).fill([1, 1, 1]),
    wedgeSolid: () => new Array(5).fill([Math.random(), Math.random(), Math.random()]), 
    wedgeGradient: () => {
      let colour1 = [Math.random(), Math.random(), Math.random()];
      let colour2 = [Math.random(), Math.random(), Math.random()];
      let colour3 = [Math.random(), Math.random(), Math.random()];
      return [colour1, colour2, colour2, colour3, colour3];
    }, 
    circleWhite: () => new Array(circleDetail + 1).fill([1, 1, 1]), 
    circleSolid: () => new Array(circleDetail + 1).fill([Math.random(), Math.random(), Math.random()]), 
    circleGradient: () => {
      let colour1 = [Math.random(), Math.random(), Math.random()];
      let colour2 = [Math.random(), Math.random(), Math.random()];
      let array1 = [colour1];
      let array2 = new Array(circleDetail).fill(colour2);
      return array1.concat(array2);
    }, 
  };

  const sprites = {
    wedgeWhite: {
      vertices: spriteVertices.wedge, 
      indices: spriteIndices.wedge, 
      colourFunction: spriteColourFunctions.wedgeWhite, 
    }, 
    wedgeSolid: {
      vertices: spriteVertices.wedge, 
      indices: spriteIndices.wedge, 
      colourFunction: spriteColourFunctions.wedgeSolid, 
    }, 
    wedgeGradient: {
      vertices: spriteVertices.wedge, 
      indices: spriteIndices.wedge, 
      colourFunction: spriteColourFunctions.wedgeGradient, 
    }, 
    circleWhite: {
      vertices: spriteVertices.circle, 
      indices: spriteIndices.circle, 
      colourFunction: spriteColourFunctions.circleWhite, 
    }, 
    circleSolid: {
      vertices: spriteVertices.circle, 
      indices: spriteIndices.circle, 
      colourFunction: spriteColourFunctions.circleSolid, 
    }, 
    circleGradient: {
      vertices: spriteVertices.circle, 
      indices: spriteIndices.circle, 
      colourFunction: spriteColourFunctions.circleGradient, 
    }, 
  }
  
  function setVariables() {
    // canvas size
    canvas.width = gl.canvas.clientWidth;
    canvas.height = gl.canvas.clientHeight;
    console.log("setVariables() drawing to " + params.width + "," + params.height + " output image");

    gl.useProgram(updatePositionProgram); gl.uniform2f(updatePositionLocations.canvasDimensions, params.width, params.height);
    gl.useProgram(drawDisplacementAoiProgram); gl.uniform2f(drawDisplacementAoiLocations.canvasDimensions, params.width, params.height);
    gl.useProgram(drawVelocityAoiProgram); gl.uniform2f(drawVelocityAoiLocations.canvasDimensions, params.width, params.height);
    gl.useProgram(drawPositionAoiProgram); gl.uniform2f(drawPositionAoiLocations.canvasDimensions, params.width, params.height);
    gl.useProgram(drawBoidsProgram); gl.uniform2f(drawBoidsLocations.canvasDimensions, params.width, params.height);
    gl.useProgram(drawTexturesProgram); gl.uniform2f(drawTexturesLocations.canvasDimensions, params.width, params.height);
    gl.useProgram(clearCanvasProgram); gl.uniform1f(clearCanvasLocations.canvasWidth, params.width);

    // boid properties
    let speeds = new Array(params.n);  
    speeds.fill(0);
    speeds.forEach((value, index) => {
      speeds[index] = Math.random() * (params.maxSpeed - params.minSpeed) + params.minSpeed;
    })
    boids.positions = new Float32Array(new Array(params.n).fill(0).map(() => [params.width * Math.random(), params.height * Math.random()]).flat());
    boids.velocities = new Float32Array(new Array(params.n).fill(0).map(() => Math.PI * 2 * Math.random()).map((angle) => [Math.cos(angle), Math.sin(angle)]).flat().map((x, i) => x * speeds[Math.floor(i / 2)]));

    // update boids buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, velocity1Buffer); gl.bufferData(gl.ARRAY_BUFFER, boids.velocities, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, velocity2Buffer); gl.bufferData(gl.ARRAY_BUFFER, boids.velocities, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, position1Buffer); gl.bufferData(gl.ARRAY_BUFFER, boids.positions, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, position2Buffer); gl.bufferData(gl.ARRAY_BUFFER, boids.positions, gl.STATIC_DRAW);

    // boid display properties
    boids.size = Math.sqrt(params.width * params.width + params.height * params.height) * 0.001 * params.boidSize;
    // boids.spriteVertices = [
    //   0.5, 0, 
    //   -0.5, -0.25, 
    //   -0.5, 0.25, 
    // ].map(v => v * boids.size);
    // boids.spriteIndices = [0, 1, 2];
    // boids.drawColours = new Float32Array(new Array(params.n).fill().map(() => new Array(boids.spriteVertices.length).fill([Math.random(), Math.random(), Math.random()]).flat()).flat());
    let sprite = sprites[params.sprite];
    boids.spriteVertices = sprite.vertices.map(v => v * boids.size); // vertices for one sprite
    boids.spriteIndices = sprite.indices; // indices for one sprite
    boids.drawColours = new Array(params.n).fill(0).map(sprite.colourFunction).flat().flat();
    console.log(boids.spriteVertices);
    console.log(boids.spriteIndices);
    console.log(boids.drawColours);
    gl.bindBuffer(gl.ARRAY_BUFFER, boidColourBuffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(boids.drawColours), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, boidVertexBuffer); gl.bufferData(gl.ARRAY_BUFFER, params.n * boids.spriteVertices.length, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, boidIndexBuffer); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, params.n * boids.spriteIndices.length, gl.STATIC_DRAW);

    // texture setup
    gl.bindTexture(gl.TEXTURE_2D, displacementAoiTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, aoiTextureWidth, aoiTextureHeight, 0, gl.RGBA, gl.FLOAT, null);
    gl.bindTexture(gl.TEXTURE_2D, velocityAoiTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, aoiTextureWidth, aoiTextureHeight, 0, gl.RGBA, gl.FLOAT, null);
    gl.bindTexture(gl.TEXTURE_2D, positionAoiTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, aoiTextureWidth, aoiTextureHeight, 0, gl.RGBA, gl.FLOAT, null);

    gl.bindTexture(gl.TEXTURE_2D, outputTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, params.width, params.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  }
  setVariables();
  
  /** set area of influence */
  const aoiVertexBuffer = gl.createBuffer();

  const drawDisplacementAoiVertexArray = makeVertexArray(gl, [[aoiVertexBuffer, drawDisplacementAoiLocations.vertex, 2, gl.FLOAT]]);
  const drawVelocityAoiVertexArray = makeVertexArray(gl, [[aoiVertexBuffer, drawVelocityAoiLocations.vertex, 2, gl.FLOAT]]);
  const drawPositionAoiVertexArray = makeVertexArray(gl, [[aoiVertexBuffer, drawPositionAoiLocations.vertex, 2, gl.FLOAT]]);

  function drawAoi() {
    // console.log("drawAoi");
    // points around circle
    const circlePoints = unitCircle.map((v) => v * params.aoiRadius);
    
    // vertices for centre and points on the circumference
    let circleVertices = new Array(params.n * circleDetail * 3 * 2);

    for(let c = 0; c < params.n; ++c) { // circle c of n
      let i = c * circleDetail * 3 * 2; // index of circle centre x
      for(let s = 0; s < circleDetail; ++s) { // sector s of detail
        let j = i + s * 3 * 2;
        
        let cx = boids.positions[c * 2];
        let cy = boids.positions[c * 2 + 1];
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
      gl.uniform2f(drawVelocityAoiLocations.velocity, boids.velocities[c * 2], boids.velocities[c * 2 + 1]);
      
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
      gl.uniform2f(drawPositionAoiLocations.centre, boids.positions[c * 2], boids.positions[c * 2 + 1]);
      
      gl.drawArrays(gl.TRIANGLES, c * circleDetail * 3, circleDetail * 3);
    }
    
    // disable blending
    gl.disable(gl.BLEND);
  }

  /** update positions */
  
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
    // console.log("updateBoids()");
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
    gl.getBufferSubData(gl.ARRAY_BUFFER, 0, boids.velocities);
    gl.bindBuffer(gl.ARRAY_BUFFER, current.outputPositionBuffer);
    gl.getBufferSubData(gl.ARRAY_BUFFER, 0, boids.positions);

    let temp = current;
    current = next;
    next = temp;
  }

  /** draw boids */
  const boidVertexArray = makeVertexArray(gl, [
    [boidVertexBuffer, drawBoidsLocations.position, 2, gl.FLOAT], 
    [boidColourBuffer, drawBoidsLocations.colour, 3, gl.FLOAT], 
  ]);
  
  const canvasPositionBuffer = makeBuffer(gl, new Float32Array([
    -1, -1, 1, -1, 1, 1, 
    -1, -1, 1, 1, -1, 1, 
  ]), gl.STATIC_DRAW);
  const drawTextureVertexArray = makeVertexArray(gl, [[canvasPositionBuffer, drawTexturesLocations.position, 2, gl.FLOAT]]);
  const clearCanvasVertexArray = makeVertexArray(gl, [[canvasPositionBuffer, clearCanvasLocations.position, 2, gl.FLOAT]]);

  function drawBoids() {
    // console.log("drawBoids()");
    let drawVertices = new Array(params.n * boids.spriteVertices.length);
    let drawIndices = new Array(params.n * boids.spriteIndices.length);

    for (let b = 0; b < params.n; ++b) { // boid b of n
      let i = b * 2;
      let px = boids.positions[i];
      let py = boids.positions[i + 1];
      let vx = boids.velocities[i];
      let vy = boids.velocities[i + 1];

      let k = b * boids.spriteVertices.length; // index of first x coordinate within boidVertices
      for (let j = 0; j < boids.spriteVertices.length; j += 2) { // vertex j of 6
        let v = [boids.spriteVertices[j], boids.spriteVertices[j + 1], 0];
        let u = Vec3.normalise([vx, vy, 0]);
        let v2 = [
          v[0]*u[0] - v[1]*u[1], 
          v[0]*u[1] + v[1]*u[0], 
        ];

        drawVertices[k + j] = px + v2[0];
        drawVertices[k + j + 1] = py + v2[1];
      }

      let offset = b * boids.spriteVertices.length * 0.5;
      for (let j = 0; j < boids.spriteIndices.length; j++) {
        drawIndices[j + b * boids.spriteIndices.length] = boids.spriteIndices[j] + offset;
      }
    }

    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ZERO, gl.ONE);
    gl.blendEquation(gl.FUNC_REVERSE_SUBTRACT);

    gl.bindFramebuffer(gl.FRAMEBUFFER, outputFramebuffer);
    gl.viewport(0, 0, params.width, params.height);
    
    // fade out previous canvas
    gl.useProgram(clearCanvasProgram);
    gl.bindVertexArray(clearCanvasVertexArray);
    let fadeStrength = 1 / (params.trailLength + 1);
    gl.uniform4f(clearCanvasLocations.clearColour, fadeStrength, fadeStrength, fadeStrength, 1);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    
    gl.disable(gl.BLEND);

    // draw boids
    gl.useProgram(drawBoidsProgram);
  
    gl.uniform2f(drawBoidsLocations.canvasDimensions, params.width, params.height);

    gl.bindVertexArray(boidVertexArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, boidVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(drawVertices), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, boidIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(drawIndices), gl.STATIC_DRAW);

    // gl.drawArrays(gl.TRIANGLES, 0, params.n * boids.spriteMesh.length * 0.5);
    gl.drawElements(gl.TRIANGLES, params.n * boids.spriteIndices.length, gl.UNSIGNED_SHORT, 0);
  }

  function drawTexture(texture, print = false) {
    let width = canvas.width;
    let height = canvas.height;
    if (!print) {
      let clientAspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
      let outputAspect = params.width / params.height;
      let correctionFactor = clientAspect / outputAspect;
      if (clientAspect < outputAspect) {
        height *= correctionFactor;
      } else {
        width /= correctionFactor;
      }
    }

    gl.useProgram(drawTexturesProgram);

    gl.bindVertexArray(drawTextureVertexArray);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(print ? 0 : (canvas.width - width) * 0.5, print ? 0 : (canvas.height - height) * 0.5, width, height);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  
  function clearCanvas() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, outputFramebuffer);
    gl.viewport(0, 0, canvas.width, canvas.height);
  
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
  clearCanvas();

  // simulation functions
  function setSimulation() {
    console.log("<< Simulation reset >>");
    setParams();
    setVariables();
    clearCanvas();
    step(0);
  }

  function step(deltaTime) {
    drawAoi();
    updateBoids(deltaTime);
    drawBoids();
    drawTexture(outputTexture);
  }
  step(0);

  const fpsIndicator = document.querySelector("#fps");
  let then = 0
  function loop(time) {
    if (!play) {
      console.log("<< STOPPED LOOP >>")
      return;
    }
    let deltaTime = time - then;
    then = time;

    fpsIndicator.textContent = "FPS: " + Math.round(1000 / deltaTime);
    step(0.0167);
    
    requestAnimationFrame(loop);
  }

  function keyPress(event) {
    if (event.key == ' ') {
      playPause();
    } else if (event.key == 'x') {
      console.log("back");
      screenshotWindow.src = "";
    }
  }

  let play = false;
  function playPause() {
    play = !play;
    if (play) {
      console.log("<< STARTED LOOP >>")
      let time = performance.now();
      then = time;
      loop(time);
    }
  }

  document.addEventListener("keypress", keyPress);

  let i = 0;
  const steps = [
    () => {
      // console.log("\n\nStep\n\n\n");
      drawAoi();
      updateBoids(0.05);
      drawTexture(displacementAoiTexture);
    },
  ];

  function manualStep() {
    steps[i % steps.length]();
    ++i;
  }

  const downloadAnchor = document.querySelector("#download");
  function screenshot() {
    canvas.width = params.width;
    canvas.height = params.height;
    drawTexture(outputTexture, true);
    console.log(canvas.width, canvas.height);
    canvas.getContext("2d");
    let url = canvas.toDataURL();
    // document.defaultView.open(url);
    // screenshotWindow.src = url;
    downloadAnchor.href = url;
    downloadAnchor.download = "boids_" + [params.width, params.height].join('x') + "_" + [params.n, params.maxAcc, params.minSpeed, params.maxSpeed, params.separationF, params.alignmentF, params.cohesionF, params.aoiRadius, params.trailLength].join('-');
    downloadAnchor.click();
    canvas.width = gl.canvas.clientWidth;
    canvas.height = gl.canvas.clientHeight;
    drawTexture(outputTexture);
  }
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