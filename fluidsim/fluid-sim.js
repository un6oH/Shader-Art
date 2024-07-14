function main() {
  const canvas = document.getElementById("gl-canvas");
  const gl = canvas.getContext("webgl2");

  canvas.width = gl.canvas.clientWidth;
  canvas.height = gl.canvas.clientHeight;

  gl.getExtension("OES_texture_float_linear");
  gl.getExtension("EXT_color_buffer_float");
  gl.getExtension("EXT_float_blend");

  // programs
  console.log("creating advect program");
  const advectProgram = createProgram(gl, VSTexture, FSAdvect);
  const advectLocations = createLocations(gl, advectProgram, ["clipSpace"], ["velocityField", "deltaTime", "dx"]);

  console.log("creating copy velocity program");
  const copyVelocityProgram = createProgram(gl, VSTexture, FSCopyVelocity);
  const copyVelocityLocations = createLocations(gl, copyVelocityProgram, ["clipSpace"], ["velocityField"]);
  
  console.log("creating copy pressure program");
  const copyPressureProgram = createProgram(gl, VSTexture, FSCopyPressure);
  const copyPressureLocations = createLocations(gl, copyVelocityProgram, ["clipSpace"], ["pressureField"]);

  console.log("creating diffuse program"); 
  const diffuseProgram = createProgram(gl, VSDiffuse, FSDiffuse);
  const diffuseLocations = createLocations(gl, diffuseProgram, ["pixel"], ["textureDimensions", "velocityResult", "velocityField", "deltaTime", "dx"]);
  gl.useProgram(diffuseProgram);
  gl.uniform1i(diffuseLocations.velocityResult, 0);
  gl.uniform1i(diffuseLocations.velocityField, 1);

  console.log("creating apply force program");
  const applyForceProgram = createProgram(gl, VSApplyForce, FSApplyForce);
  const applyForceLocations = createLocations(gl, applyForceProgram, ["position"], ["textureDimensions", "splatRadius", "inputVelocity", "deltaTime"]);

  console.log("creating divergence calc program");
  const divergenceCalcProgram = createProgram(gl, VSDiffuse, FSDivergenceCalc);
  const divergenceCalcLocations = createLocations(gl, divergenceCalcProgram, ["pixel"], ["textureDimensions", "velocityField", "dx"]);

  console.log("creating solve pressure program");
  const solvePressureProgram = createProgram(gl, VSDiffuse, FSSolvePressure);
  const solvePressureLocations = createLocations(gl, solvePressureProgram, ["pixel"], ["textureDimensions", "divergenceResult", "pressureField"]);
  gl.useProgram(solvePressureProgram);
  gl.uniform1i(solvePressureLocations.divergenceResult, 0);
  gl.uniform1i(solvePressureLocations.pressureField, 1);

  console.log("creating gradient subtract program");
  const gradientSubtractProgram = createProgram(gl, VSDiffuse, FSGradientSubtract);
  const gradientSubtractLocations = createLocations(gl, gradientSubtractProgram, ["pixel"], ["textureDimensions", "velocityField", "pressureField", "dx"]);
  gl.useProgram(gradientSubtractProgram);
  gl.uniform1i(gradientSubtractLocations.velocityField, 0);
  gl.uniform1i(gradientSubtractLocations.pressureField, 1);

  console.log("creating set boundaries velocity program");
  const setBoundariesVelocityProgram = createProgram(gl, VSSetBoundaries, FSSetBoundariesVelocity);
  const setBoundariesVelocityLocations = createLocations(gl, setBoundariesVelocityProgram, ["position", "normal"], ["textureDimensions", "velocityField", "px"]);
  
  console.log("creating set boundaries pressure program");
  const setBoundariesPressureProgram = createProgram(gl, VSSetBoundaries, FSSetBoundariesPressure);
  const setBoundariesPressureLocations = createLocations(gl, setBoundariesPressureProgram, ["position", "normal"], ["textureDimensions", "pressureField", "px"]);

  console.log("creating displayProgram");
  const displayProgram = createProgram(gl, VSTexture, FSDisplayTexture);
  const displayLocations = createLocations(gl, displayProgram, ["clipSpace"], ["velocityField", "pressureField", "mode"]);
  gl.useProgram(displayProgram);
  gl.uniform1i(displayLocations.velocityField, 0);
  gl.uniform1i(displayLocations.pressureField, 1);

  // define buffers
  const clipSpaceBuffer = makeBuffer(gl, new Float32Array([
    -1, 1, 1, 1, 1, -1, 
    -1, 1, 1, -1, -1, -1, 
  ]), gl.STATIC_DRAW); // no change
  const pixelCoordBuffer = gl.createBuffer(); // changes with texture size

  // define textures
  // alternating framebuffers
  const velocityTextures = [
    createTexture(gl, [gl.LINEAR, gl.LINEAR, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]),
    createTexture(gl, [gl.LINEAR, gl.LINEAR, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]),
  ]; 
  const pressureTextures = [
    createTexture(gl, [gl.LINEAR, gl.LINEAR, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]),
    createTexture(gl, [gl.LINEAR, gl.LINEAR, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]),
  ];
  const velocityFramebuffers = [
    gl.createFramebuffer(), 
    gl.createFramebuffer(), 
  ];
  const pressureFramebuffers = [
    gl.createFramebuffer(), 
    gl.createFramebuffer(), 
  ];

  // non-alternating framebuffers
  const velocityResultTexture = createTexture(gl, [gl.LINEAR, gl.LINEAR, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]);
  const velocityResultFramebuffer = gl.createFramebuffer();

  const divergenceResultTexture = createTexture(gl, [gl.LINEAR, gl.LINEAR, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]);
  const divergenceResultFramebuffer = gl.createFramebuffer();

  let textureWidth = 256;
  let textureHeight = 256;
  let simulationWidth = 100;
  let simulationHeight = 100;

  const params = {
    dx: [textureWidth / simulationWidth, textureHeight / simulationHeight],
  }

  function setup() {
    // parameters
    params.dx = [textureWidth / simulationWidth, textureHeight / simulationHeight];

    // buffers
    setupBuffer(gl, pixelCoordBuffer, new Float32Array([
      0, 0, textureWidth, 0, textureWidth, textureHeight, 
      0, 0, textureWidth, textureHeight, 0, textureHeight
    ]), gl.STATIC_DRAW);

    // textures and framebuffers
    let zeroes = new Float32Array([0, 0, 0, 0]);
    [0, 1].forEach((i) => {
      gl.bindTexture(gl.TEXTURE_2D, velocityTextures[i]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, textureWidth, textureHeight, 0, gl.RG, gl.FLOAT, null);
      
      gl.bindTexture(gl.TEXTURE_2D, pressureTextures[i]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, textureWidth, textureHeight, 0, gl.RED, gl.FLOAT, null);

      setupFramebuffer(gl, velocityFramebuffers[i], velocityTextures[i]);
      gl.clearBufferfv(gl.COLOR, 0, zeroes);
      setupFramebuffer(gl, pressureFramebuffers[i], pressureTextures[i]);
      gl.clearBufferfv(gl.COLOR, 0, zeroes);
    });

    gl.bindTexture(gl.TEXTURE_2D, velocityResultTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, textureWidth, textureHeight, 0, gl.RG, gl.FLOAT, null);
    setupFramebuffer(gl, velocityResultFramebuffer, velocityResultTexture);
    gl.clearBufferfv(gl.COLOR, 0, zeroes);
    
    gl.bindTexture(gl.TEXTURE_2D, divergenceResultTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, textureWidth, textureHeight, 0, gl.RED, gl.FLOAT, null);
    setupFramebuffer(gl, divergenceResultFramebuffer, divergenceResultTexture);
    gl.clearBufferfv(gl.COLOR, 0, zeroes);

  }
  setup();

  let step = 0;
  function update(deltaTime) {
    // console.log("update", deltaTime);
    advect(deltaTime);
    diffuse(deltaTime);
    if (applyForce) {
      addForce(deltaTime);
    }
    project();
  }

  const advectVertexArray = makeVertexArray(gl, [[clipSpaceBuffer, advectLocations.clipSpace, 2, gl.FLOAT]]);
  function advect(deltaTime) {
    gl.useProgram(advectProgram);

    gl.bindVertexArray(advectVertexArray);
    bindTextureToLocation(gl, advectLocations.velocityField, 0, velocityTextures[step % 2]);
    gl.uniform1f(advectLocations.deltaTime, deltaTime);
    gl.uniform2fv(advectLocations.dx, params.dx);

    setFramebuffer(gl, velocityFramebuffers[(step + 1) % 2], textureWidth, textureHeight);
    gl.clearBufferfv(gl.COLOR, 0, [0.0, 0.0, 0.0, 0.0]);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    ++step;
  }

  const copyVelocityVertexArray = makeVertexArray(gl, [[clipSpaceBuffer, copyVelocityLocations.clipSpace, 2, gl.FLOAT]]);
  const diffuseVertexArray = makeVertexArray(gl, [[pixelCoordBuffer, diffuseLocations.pixel, 2, gl.FLOAT]]);
  function diffuse(deltaTime) {
    // console.log("diffuse()");
    // copy fields to result textures
    gl.useProgram(copyVelocityProgram);

    gl.bindVertexArray(copyVelocityVertexArray);
    bindTextureToLocation(gl, copyVelocityLocations.velocityField, 0, velocityTextures[step % 2]);

    setFramebuffer(gl, velocityResultFramebuffer, textureWidth, textureHeight);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // bindTextureToLocation(gl, copyVelocityLocations.velocityField, 0, velocityResultTexture);
    // bindTextureToLocation(gl, copyVelocityLocations.pressureField, 1, pressureResultTexture);

    // setFramebuffer(gl, velocityFramebuffers[(vStep + 1) % 2], textureWidth, textureHeight);
    // gl.drawArrays(gl.TRIANGLES, 0, 6);

    // ++vStep;

    // diffusion algorithm
    gl.useProgram(diffuseProgram);

    gl.bindVertexArray(diffuseVertexArray);
    bindTextureToLocation(gl, diffuseLocations.velocityResult, 0, velocityResultTexture);
    gl.uniform2f(diffuseLocations.textureDimensions, textureWidth, textureHeight);
    gl.uniform1f(diffuseLocations.deltaTime, deltaTime);
    gl.uniform2fv(diffuseLocations.dx, params.dx);

    for (let i = 0; i < 20; ++i) {
      bindTextureToLocation(gl, diffuseLocations.velocityField, 1, velocityTextures[step % 2]);
      
      setFramebuffer(gl, velocityFramebuffers[(step + 1) % 2], textureWidth, textureHeight);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      ++step;
    }
  }

  let applyForce = false;
  let mouseX, mouseY, movementX, movementY;

  const forcePositionBuffer = gl.createBuffer();
  const addForceVertexArray = makeVertexArray(gl, [[forcePositionBuffer, applyForceLocations.position, 2, gl.FLOAT]]);
  function addForce(deltaTime) {
    // position
    let width = canvas.width;
    let height = canvas.height;

    let clientAspect = canvas.width / canvas.height;
    let outputAspect = textureWidth / textureHeight;
    let correctionFactor = clientAspect / outputAspect;
    if (clientAspect < outputAspect) {
      height *= correctionFactor;
    } else {
      width /= correctionFactor;
    }

    let offsetX = (canvas.width - width) / 2;
    let offsetY = (canvas.height - height) / 2;
    let textureX = mouseX - offsetX;
    let textureY = mouseY - offsetY;

    // movement scaled to texture
    let textureDX = movementX * (textureWidth / canvas.width);
    let textureDY = movementY * (textureHeight / canvas.height);

    // movement scaled to simulation
    let simDX = textureDX * (simulationWidth / textureWidth);
    let simDY = textureDY * (simulationHeight / textureHeight);
    
    // calculate force
    let velX = simDX / deltaTime;
    let velY = simDY / deltaTime * -1;

    // console.log("offset:", offsetX, offsetY);
    // console.log("position:", textureX, textureY);
    // console.log("change in position:", simDX, simDY);
    // console.log("velocity:", velX, velY);

    gl.useProgram(applyForceProgram);

    setupBuffer(gl, forcePositionBuffer, new Float32Array([textureX, textureY]), gl.STATIC_DRAW);
    gl.bindVertexArray(addForceVertexArray);

    gl.uniform2f(applyForceLocations.textureDimensions, width, height);
    gl.uniform1f(applyForceLocations.splatRadius, Math.sqrt(velX**2 + velY**2) / simulationWidth);
    // gl.uniform1f(applyForceLocations.splatRadius, 10);
    gl.uniform2f(applyForceLocations.inputVelocity, velX, velY);
    // gl.uniform2f(applyForceLocations.inputVelocity, 1, 1);
    gl.uniform1f(applyForceLocations.deltaTime, deltaTime);
    
    setFramebuffer(gl, velocityFramebuffers[step % 2], textureWidth, textureHeight);

    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.drawArrays(gl.POINTS, 0, 1);
    gl.disable(gl.BLEND);
  }

  const divergenceCalcVertexArray = makeVertexArray(gl, [[pixelCoordBuffer, divergenceCalcLocations.pixel, 2, gl.FLOAT]]);
  const solvePressureVertexArray = makeVertexArray(gl, [[pixelCoordBuffer, solvePressureLocations.pixel, 2, gl.FLOAT]]);
  const gradientSubtractVertexArray = makeVertexArray(gl, [[pixelCoordBuffer, gradientSubtractLocations.pixel, 2, gl.FLOAT]]);
  function project() {
    // divergence calculation
    gl.useProgram(divergenceCalcProgram);

    gl.bindVertexArray(divergenceCalcVertexArray);
    gl.uniform2f(divergenceCalcLocations.textureDimensions, textureWidth, textureHeight);
    bindTextureToLocation(gl, divergenceCalcLocations.velocityField, 0, velocityTextures[step % 2]);
    gl.uniform2fv(divergenceCalcLocations.dx, params.dx);

    setFramebuffer(gl, divergenceResultFramebuffer, textureWidth, textureHeight);
    gl.clearBufferfv(gl.COLOR, 0, [0.0, 0.0, 0.0, 0.0]);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // reset pressure
    [0, 1].forEach((i) => {
      setFramebuffer(gl, pressureFramebuffers[i], textureWidth, textureHeight);
      gl.clearBufferfv(gl.COLOR, 0, [0.0, 0.0, 0.0, 0.0]);
    });

    // solve pressure
    gl.useProgram(solvePressureProgram);

    gl.bindVertexArray(solvePressureVertexArray);
    gl.uniform2f(solvePressureLocations.textureDimensions, textureWidth, textureHeight);
    bindTextureToLocation(gl, solvePressureLocations.divergenceResult, 0, divergenceResultTexture);

    for (let i = 0; i < 40; ++i) {
      bindTextureToLocation(gl, solvePressureLocations.pressureField, 1, pressureTextures[i % 2]);

      setFramebuffer(gl, pressureFramebuffers[(i + 1) % 2], textureWidth, textureHeight);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    // subtract gradient
    gl.useProgram(gradientSubtractProgram);

    gl.bindVertexArray(gradientSubtractVertexArray);
    gl.uniform2f(gradientSubtractLocations.textureDimensions, textureWidth, textureHeight);
    bindTextureToLocation(gl, gradientSubtractLocations.velocityField, 0, velocityTextures[step % 2]);
    bindTextureToLocation(gl, gradientSubtractLocations.pressureField, 1, pressureTextures[0]);
    gl.uniform2fv(gradientSubtractLocations.dx, params.dx);

    setFramebuffer(gl, velocityFramebuffers[(step + 1) % 2], textureWidth, textureHeight);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    ++step;
  }

  function setBoundaries() {

  }

  let mouseIsPressed = false;
  document.addEventListener('mousedown', () => {
    mouseIsPressed = true;
  })
  document.addEventListener('mousemove', (event) => {
    if (mouseIsPressed && (event.movementX != 0 || event.movementY != 0)) {
      applyForce = true;
      mouseX = event.clientX;
      mouseY = event.clientY;
      movementX = event.movementX;
      movementY = event.movementY;
      addForce(0.0167);
      display(false, 0);
    }
  });
  document.addEventListener('mouseup', () => {
    mouseIsPressed = false;
    applyForce = false;
  });
  
  let loop = false;
  let paused = true;
  let timePreviousFrame = 0;
  function frame(time) {
    let deltaTime = 0;
    if (!paused) {
      deltaTime = timePreviousFrame - time;
      paused = false;
    }
    console.log("frame()", deltaTime, paused);
    update(0.0167);
    display(false, 0);

    if (loop) {
      timePreviousFrame = time;
      requestAnimationFrame(frame);
    } else {
      paused = true;
      console.log("stopped loop");
    }
  }

  document.addEventListener('keypress', (event) => {
    if (event.key = ' ') {
      loop = !loop;
      if (loop) {
        console.log("started loop");
        timePreviousFrame = 0;
        requestAnimationFrame(frame);
      }
    }
  });

  const displayVertexArray = makeVertexArray(gl, [[clipSpaceBuffer, displayLocations.clipSpace, 2, gl.FLOAT]]);
  function display(print = false, mode = 0) {
    let width = canvas.width;
    let height = canvas.height;
    if (!print) {
      let clientAspect = canvas.width / canvas.height;
      let outputAspect = textureWidth / textureHeight;
      let correctionFactor = clientAspect / outputAspect;
      if (clientAspect < outputAspect) {
        height *= correctionFactor;
      } else {
        width /= correctionFactor;
      }
    }

    gl.useProgram(displayProgram);

    gl.bindVertexArray(displayVertexArray);
    bindTextureToLocation(gl, displayLocations.velocityField, 0, velocityTextures[step % 2]);
    bindTextureToLocation(gl, displayLocations.pressureField, 1, pressureTextures[step % 2]);
    gl.uniform1i(displayLocations.mode, mode);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport((canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
    
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
}

main();