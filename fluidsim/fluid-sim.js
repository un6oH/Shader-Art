function main() {
  const canvas = document.getElementById("gl-canvas");
  const gl = canvas.getContext("webgl2");

  canvas.width = gl.canvas.clientWidth;
  canvas.height = gl.canvas.clientHeight;
  window.onresize = () => {
    canvas.width = gl.canvas.clientWidth;
    canvas.height = gl.canvas.clientHeight;
  }

  gl.getExtension("OES_texture_float_linear");
  gl.getExtension("EXT_color_buffer_float");
  gl.getExtension("EXT_float_blend");

  // programs
  console.log("creating set boundary program");
  const setBoundariesProgram = createProgram(gl, VSSetBoundaries, FSSetBoundaries);
  const setBoundariesLocations = createLocations(gl, setBoundariesProgram, ["pixel", "normal"], ["textureDimensions"]);

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
  const diffuseLocations = createLocations(gl, diffuseProgram, ["pixel"], ["textureDimensions", "velocityResult", "velocityField", "boundaryBoolean", "boundaryNormal", "deltaTime", "dx", "px"]);
  gl.useProgram(diffuseProgram);
  gl.uniform1i(diffuseLocations.velocityResult, 0);
  gl.uniform1i(diffuseLocations.velocityField, 1);
  gl.uniform1i(diffuseLocations.boundaryBoolean, 2);
  gl.uniform1i(diffuseLocations.boundaryNormal, 3);

  console.log("creating apply force program");
  const applyForceProgram = createProgram(gl, VSSplat, FSApplyForce);
  const applyForceLocations = createLocations(gl, applyForceProgram, ["position"], ["textureDimensions", "splatRadius", "inputVelocity", "deltaTime"]);

  console.log("creating divergence calc program");
  const divergenceCalcProgram = createProgram(gl, VSDiffuse, FSDivergenceCalc);
  const divergenceCalcLocations = createLocations(gl, divergenceCalcProgram, ["pixel"], ["textureDimensions", "velocityField", "dx"]);

  console.log("creating solve pressure program");
  const solvePressureProgram = createProgram(gl, VSDiffuse, FSSolvePressure);
  const solvePressureLocations = createLocations(gl, solvePressureProgram, ["pixel"], ["textureDimensions", "divergenceResult", "pressureField", "boundaryBoolean", "boundaryNormal", "px"]);
  gl.useProgram(solvePressureProgram);
  gl.uniform1i(solvePressureLocations.divergenceResult, 0);
  gl.uniform1i(solvePressureLocations.pressureField, 1);
  gl.uniform1i(solvePressureLocations.boundaryBoolean, 2);
  gl.uniform1i(solvePressureLocations.boundaryNormal, 3);

  console.log("creating gradient subtract program");
  const gradientSubtractProgram = createProgram(gl, VSDiffuse, FSGradientSubtract);
  const gradientSubtractLocations = createLocations(gl, gradientSubtractProgram, ["pixel"], ["textureDimensions", "velocityField", "pressureField", "dx"]);
  gl.useProgram(gradientSubtractProgram);
  gl.uniform1i(gradientSubtractLocations.velocityField, 0);
  gl.uniform1i(gradientSubtractLocations.pressureField, 1);

  console.log("creating dye advect program");
  const advectDyeProgram = createProgram(gl, VSTexture, FSAdvectDye);
  const advectDyeLocations = createLocations(gl, advectDyeProgram, ["clipSpace"], ["velocityField", "dyeField", "deltaTime", "dx"]);
  gl.useProgram(advectDyeProgram);
  gl.uniform1i(advectDyeLocations.velocityField, 0);
  gl.uniform1i(advectDyeLocations.dyeField, 1);

  console.log("creating dye diffuse program");
  const diffuseDyeProgram = createProgram(gl, VSDiffuse, FSDiffuseDye);
  const diffuseDyeLocations = createLocations(gl, diffuseDyeProgram, ["pixel"], ["textureDimensions", "dyeResult", "dyeField", "boundaryBoolean", "boundaryNormal", "deltaTime", "dx"]);
  gl.useProgram(diffuseDyeProgram);
  gl.uniform1i(diffuseDyeLocations.dyeResult, 0);
  gl.uniform1i(diffuseDyeLocations.dyeField, 1);
  gl.uniform1i(diffuseDyeLocations.boundaryBoolean, 2);
  gl.uniform1i(diffuseDyeLocations.boundaryNormal, 3);
  
  console.log("creating dye add program");
  const addDyeProgram = createProgram(gl, VSSplat, FSAddDye);
  const addDyeLocations = createLocations(gl, addDyeProgram, ["position"], ["textureDimensions", "splatRadius", "inputDensity"]);

  console.log("creating displayProgram");
  const displayProgram = createProgram(gl, VSTexture, FSDisplayTexture);
  const displayLocations = createLocations(gl, displayProgram, ["clipSpace"], ["velocityField", "pressureField", "boundaryBoolean", "divergenceResult", "dyeField", "simulationDimensions", "mode"]);
  gl.useProgram(displayProgram);
  gl.uniform1i(displayLocations.velocityField, 0);
  gl.uniform1i(displayLocations.pressureField, 1);
  gl.uniform1i(displayLocations.boundaryBoolean, 2);
  gl.uniform1i(displayLocations.divergenceResult, 3);
  gl.uniform1i(displayLocations.dyeField, 4);

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

  const dyeTextures = [
    createTexture(gl, [gl.LINEAR, gl.LINEAR, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]),
    createTexture(gl, [gl.LINEAR, gl.LINEAR, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]),
  ];
  const dyeFramebuffers = [
    gl.createFramebuffer(), 
    gl.createFramebuffer(), 
  ];

  // non-alternating framebuffers
  const velocityResultTexture = createTexture(gl, [gl.LINEAR, gl.LINEAR, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]);
  const velocityResultFramebuffer = gl.createFramebuffer();

  const divergenceTexture = createTexture(gl, [gl.LINEAR, gl.LINEAR, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]);
  const divergenceFramebuffer = gl.createFramebuffer();

  const boundaryBooleanTexture = createTexture(gl, [gl.NEAREST, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]);
  const boundaryNormalTexture = createTexture(gl, [gl.NEAREST, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]);
  const boundaryFramebuffer = gl.createFramebuffer();

  const dyeResultTexture = createTexture(gl, [gl.LINEAR, gl.LINEAR, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]);

  let textureWidth = 512;
  let textureHeight = 512;
  let simulationWidth = 100.0;
  let simulationHeight = 100.0;

  const params = {
    dx: [textureWidth / simulationWidth, textureHeight / simulationHeight],
    px: [1 / textureWidth, 1 / textureHeight], 
  };

  const boundaryPositionBuffer = gl.createBuffer();
  const boundaryNormalBuffer = makeBuffer(gl, new Float32Array([
    1, 0, 1, 0, 
    -1, 0, -1, 0, 
    0, -1, 0, -1, 
    0, 1, 0, 1, 
  ]), gl.STATIC_DRAW);
  const setBoundariesVertexArray = makeVertexArray(gl, [
    [boundaryPositionBuffer, setBoundariesLocations.pixel, 2, gl.FLOAT], 
    [boundaryNormalBuffer, setBoundariesLocations.normal, 2, gl.FLOAT], 
  ]);
  function setup() {
    // parameters
    params.dx = [textureWidth / simulationWidth, textureHeight / simulationHeight];

    // buffers
    setupBuffer(gl, pixelCoordBuffer, new Float32Array([
      0, 0, textureWidth, 0, textureWidth, textureHeight, 
      0, 0, textureWidth, textureHeight, 0, textureHeight
    ]), gl.STATIC_DRAW);

    setupBuffer(gl, boundaryPositionBuffer, new Float32Array([
      0, 0, 1, textureHeight, 
      textureWidth - 1, 0, textureWidth, textureHeight, 
      0, 0, textureWidth, 1, 
      0, textureHeight - 1, textureWidth, textureHeight, 
    ]), gl.STATIC_DRAW);

    // textures and framebuffers
    let zeroes = new Float32Array([0, 0, 0, 0]);
    [0, 1].forEach((i) => {
      gl.bindTexture(gl.TEXTURE_2D, velocityTextures[i]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, textureWidth, textureHeight, 0, gl.RG, gl.FLOAT, null);
      
      gl.bindTexture(gl.TEXTURE_2D, pressureTextures[i]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, textureWidth, textureHeight, 0, gl.RED, gl.FLOAT, null);
      
      gl.bindTexture(gl.TEXTURE_2D, dyeTextures[i]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, textureWidth, textureHeight, 0, gl.RED, gl.FLOAT, null);

      setupFramebuffer(gl, velocityFramebuffers[i], velocityTextures[i]);
      gl.clearBufferfv(gl.COLOR, 0, zeroes);
      setupFramebuffer(gl, pressureFramebuffers[i], pressureTextures[i]);
      gl.clearBufferfv(gl.COLOR, 0, zeroes);
      setupFramebuffer(gl, dyeFramebuffers[i], dyeTextures[i]);
      gl.clearBufferfv(gl.COLOR, 0, [1.0, 0.0, 0.0, 0.0]);
    });

    gl.bindTexture(gl.TEXTURE_2D, velocityResultTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, textureWidth, textureHeight, 0, gl.RG, gl.FLOAT, null);
    setupFramebuffer(gl, velocityResultFramebuffer, velocityResultTexture);
    gl.clearBufferfv(gl.COLOR, 0, zeroes);
    
    gl.bindTexture(gl.TEXTURE_2D, divergenceTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, textureWidth, textureHeight, 0, gl.RED, gl.FLOAT, null);
    setupFramebuffer(gl, divergenceFramebuffer, divergenceTexture);
    gl.clearBufferfv(gl.COLOR, 0, zeroes);

    gl.bindTexture(gl.TEXTURE_2D, boundaryBooleanTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, textureWidth, textureHeight, 0, gl.RED, gl.UNSIGNED_BYTE, null);
    gl.bindTexture(gl.TEXTURE_2D, boundaryNormalTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, textureWidth, textureHeight, 0, gl.RG, gl.FLOAT, null);
    setupFramebuffer(gl, boundaryFramebuffer, boundaryBooleanTexture, boundaryNormalTexture);

    gl.bindTexture(gl.TEXTURE_2D, dyeResultTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, textureWidth, textureHeight, 0, gl.RED, gl.FLOAT, null);

    // set boundaries
    gl.useProgram(setBoundariesProgram);

    gl.bindVertexArray(setBoundariesVertexArray);
    gl.uniform2f(setBoundariesLocations.textureDimensions, textureWidth, textureHeight);

    setFramebuffer(gl, boundaryFramebuffer, textureWidth, textureHeight);
    gl.clearBufferfv(gl.COLOR, 0, [0.0, 0.0, 0.0, 0.0]);
    gl.clearBufferfv(gl.COLOR, 1, [0.0, 0.0, 0.0, 0.0]);
    gl.drawArrays(gl.LINES, 0, 8);
  }
  setup();

  let step = 0;
  function update(deltaTime) {
    console.log("update()", deltaTime);
    advect(deltaTime);
    diffuse(deltaTime);
    if (movementX != 0 && movementY != 0) {
      addForce(deltaTime);
    }
    project();
    updateDye(deltaTime);
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
    // gl.useProgram(copyVelocityProgram);

    // gl.bindVertexArray(copyVelocityVertexArray);
    // bindTextureToLocation(gl, copyVelocityLocations.velocityField, 0, velocityTextures[step % 2]);

    // setFramebuffer(gl, velocityResultFramebuffer, textureWidth, textureHeight);
    // gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindFramebuffer(gl.FRAMEBUFFER, velocityFramebuffers[step % 2]);
    gl.bindTexture(gl.TEXTURE_2D, velocityResultTexture);
    gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RG32F, 0, 0, textureWidth, textureHeight, 0);

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
    
    // calculate velocity
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
  const copyPressureVertexArray = makeVertexArray(gl, [[clipSpaceBuffer, copyPressureLocations.clipSpace, 2, gl.FLOAT]]);
  
  
  let gradientSubtractEnabled = true;
  function project() {
    // divergence calculation
    gl.useProgram(divergenceCalcProgram);

    gl.bindVertexArray(divergenceCalcVertexArray);
    gl.uniform2f(divergenceCalcLocations.textureDimensions, textureWidth, textureHeight);
    bindTextureToLocation(gl, divergenceCalcLocations.velocityField, 0, velocityTextures[step % 2]);
    gl.uniform2fv(divergenceCalcLocations.dx, params.dx);

    setFramebuffer(gl, divergenceFramebuffer, textureWidth, textureHeight);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // reset pressure
    // [0, 1].forEach((i) => {
    //   setFramebuffer(gl, pressureFramebuffers[i], textureWidth, textureHeight);
    //   gl.clearBufferfv(gl.COLOR, 0, [0.0, 0.0, 0.0, 0.0]);
    // });

    // set initial pressure to divergence
    gl.useProgram(copyPressureProgram);

    gl.bindVertexArray(copyPressureVertexArray);
    bindTextureToLocation(gl, copyPressureLocations.pressureField, 0, divergenceTexture);
    
    setFramebuffer(gl, pressureFramebuffers[0], textureWidth, textureHeight);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // solve pressure
    gl.useProgram(solvePressureProgram);

    gl.bindVertexArray(solvePressureVertexArray);
    gl.uniform2f(solvePressureLocations.textureDimensions, textureWidth, textureHeight);
    bindTextureToLocation(gl, solvePressureLocations.divergenceResult, 0, divergenceTexture);
    bindTextureToLocation(gl, solvePressureLocations.boundaryBoolean, 2, boundaryBooleanTexture);
    bindTextureToLocation(gl, solvePressureLocations.boundaryNormal, 3, boundaryNormalTexture);

    for (let i = 0; i < 40; ++i) {
      bindTextureToLocation(gl, solvePressureLocations.pressureField, 1, pressureTextures[i % 2]);

      setFramebuffer(gl, pressureFramebuffers[(i + 1) % 2], textureWidth, textureHeight);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    // subtract gradient
    if (gradientSubtractEnabled) {
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
  }

  const dyePositionBuffer = gl.createBuffer();
  const addDyeVertexArray = makeVertexArray(gl, [[dyePositionBuffer, addDyeLocations.position, 2, gl.FLOAT]]);
  function addDye() {
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

    gl.useProgram(addDyeProgram);

    setupBuffer(gl, dyePositionBuffer, new Float32Array([textureX, textureY]), gl.STATIC_DRAW);
    gl.bindVertexArray(addDyeVertexArray);
    gl.uniform2f(addDyeLocations.textureDimensions, width, height);
    gl.uniform1f(addDyeLocations.splatRadius, 10);
    gl.uniform1f(addDyeLocations.inputDensity, 1);

    setFramebuffer(gl, dyeFramebuffers[dyeStep % 2], textureWidth, textureHeight);
    
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.drawArrays(gl.POINTS, 0, 1);
    gl.disable(gl.BLEND);
  }

  let dyeStep = 0;
  const advectDyeVertexArray = makeVertexArray(gl, [[clipSpaceBuffer, advectDyeLocations.clipSpace, 2, gl.FLOAT]]);
  const diffuseDyeVertexArray = makeVertexArray(gl, [[pixelCoordBuffer, diffuseLocations.pixel, 2, gl.FLOAT]]);
  function updateDye(deltaTime) {
    // if (mouseIsPressed) {
    //   addDye();
    // }

    // advect
    gl.useProgram(advectDyeProgram);

    gl.bindVertexArray(advectDyeVertexArray);
    bindTextureToLocation(gl, advectDyeLocations.velocityField, 0, velocityTextures[step % 2]);
    bindTextureToLocation(gl, advectDyeLocations.dyeField, 1, dyeTextures[dyeStep % 2]);
    gl.uniform1f(advectDyeLocations.deltaTime, deltaTime);
    gl.uniform2fv(advectDyeLocations.dx, params.dx);

    setFramebuffer(gl, dyeFramebuffers[(dyeStep + 1) % 2], textureWidth, textureHeight);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    ++dyeStep;

    // diffuse
    // copy texture to result texture
    gl.bindTexture(gl.TEXTURE_2D, dyeResultTexture);
    gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.R32F, 0, 0, textureWidth, textureHeight, 0);

    // diffuse algorithm
    gl.useProgram(diffuseDyeProgram);

    gl.bindVertexArray(diffuseDyeVertexArray);
    gl.uniform2f(diffuseDyeLocations.textureDimensions, textureWidth, textureHeight);
    bindTextureToLocation(gl, diffuseDyeLocations.dyeResult, 0, dyeResultTexture);
    bindTextureToLocation(gl, diffuseDyeLocations.boundaryBoolean, 2, boundaryBooleanTexture);
    bindTextureToLocation(gl, diffuseDyeLocations.boundaryNormal, 3, boundaryNormalTexture);
    gl.uniform1f(diffuseDyeLocations.deltaTime, deltaTime);
    gl.uniform1f(diffuseDyeLocations.dx, params.dx);

    for (let i = 0; i < 20; ++i) {
      bindTextureToLocation(gl, diffuseDyeLocations.dyeField, 1, dyeTextures[dyeStep % 2]);

      setFramebuffer(gl, dyeFramebuffers[(dyeStep + 1) % 2], textureWidth, textureHeight);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      ++dyeStep;
    }
  }

  let mouseIsPressed = false;
  document.addEventListener('mousedown', (event) => {
    mouseIsPressed = true;
    mouseX = event.clientX;
    mouseY = event.clientY;
  });
  document.addEventListener('mousemove', (event) => {
    if (mouseIsPressed) {
      mouseX = event.clientX;
      mouseY = event.clientY;
      movementX = event.movementX;
      movementY = event.movementY;
      // if (!loop) {
      //   addForce(0.0167);
      //   display(false, displayMode);
      // }
    }
  });
  document.addEventListener('mouseup', () => {
    mouseIsPressed = false;
    movementX = 0;
    movementY = 0;
  });
  
  let loop = false;
  let paused = true;
  let displayMode = 0;
  let timePreviousFrame = 0;
  function frame(time) {
    // let deltaTime = 0;
    // if (!paused) {
    //   deltaTime = (time - timePreviousFrame) / 1000;
    // } else {
    //   paused = false;
    // }
    // console.log("frame()", deltaTime, paused);
    update(0.0167);
    display(false, displayMode);

    if (loop) {
      timePreviousFrame = time;
      requestAnimationFrame(frame);
    } else {
      paused = true;
      console.log("stopped loop");
    }
  }

  document.addEventListener('keypress', (event) => {
    if (event.key == ' ') {
      loop = !loop;
      if (loop) {
        console.log("started loop");
        timePreviousFrame = 0;
        requestAnimationFrame(frame);
      }
    } else if (event.key == "f") {
      update(0.0167);
      display(false, displayMode);
    } else if (event.key == "m") {
      displayMode = displayMode < 3 ? displayMode + 1 : 0;
      console.log("displayMode:", ["velocity", "pressure", "divergence", "dye"][displayMode])
      display(false, displayMode);
    } else if (event.key == "s") {
      gradientSubtractEnabled = !gradientSubtractEnabled;
      console.log("gradient subtract", gradientSubtractEnabled ? "enabled" : "disabled");
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
    bindTextureToLocation(gl, displayLocations.pressureField, 1, pressureTextures[0]);
    bindTextureToLocation(gl, displayLocations.boundaryBoolean, 2, boundaryBooleanTexture);
    bindTextureToLocation(gl, displayLocations.divergenceResult, 3, divergenceTexture);
    bindTextureToLocation(gl, displayLocations.dyeField, 4, dyeTextures[dyeStep % 2])
    gl.uniform2f(displayLocations.simulationDimensions, simulationWidth, simulationHeight);
    gl.uniform1i(displayLocations.mode, mode);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport((canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
    
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
}

main();