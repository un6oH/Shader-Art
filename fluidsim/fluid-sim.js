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
  const advectLocations = createLocations(gl, advectProgram, ["clipSpace"], ["velocityField", "pressureField", "deltaTime", "dx"]);
  gl.useProgram(advectProgram);
  gl.uniform1i(advectLocations.velocityField, 0);
  gl.uniform1i(advectLocations.pressureField, 1);

  console.log("creating copy field program");
  const copyFieldProgram = createProgram(gl, VSTexture, FSCopyField);
  const copyFieldLocations = createLocations(gl, copyFieldProgram, ["clipSpace"], ["velocityField", "pressureField"]);
  gl.useProgram(copyFieldProgram);
  gl.uniform1i(copyFieldLocations.velocityField, 0);
  gl.uniform1i(copyFieldLocations.pressureField, 1);

  console.log("creating diffuse program"); 
  const diffuseProgram = createProgram(gl, VSDiffuse, FSDiffuse);
  const diffuseLocations = createLocations(gl, diffuseProgram, ["pixel"], ["textureDimensions", "velocityResult", "pressureResult", "velocityField", "pressureField", "deltaTime", "dx"]);
  gl.useProgram(diffuseProgram);
  gl.uniform1i(diffuseLocations.velocityResult, 0);
  gl.uniform1i(diffuseLocations.pressureResult, 1);
  gl.uniform1i(diffuseLocations.velocityField, 2);
  gl.uniform1i(diffuseLocations.pressureField, 3);

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

  console.log("creating set boundaries program");
  const setBoundariesProgram = createProgram(gl, VSSetBoundaries, FSSetBoundaries);
  const setBoundariesLocations = createLocations(gl, setBoundariesProgram, ["position", "normal"], ["textureDimensions", "velocityField", "pressureField", "px"]);
  gl.useProgram(setBoundariesProgram);
  gl.uniform1i(setBoundariesLocations.velocityField, 0);
  gl.uniform1i(setBoundariesLocations.pressureField, 1);

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
  // alternate framebuffers
  const velocityFieldTextures = [
    createTexture(gl, [gl.LINEAR, gl.LINEAR, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]),
    createTexture(gl, [gl.LINEAR, gl.LINEAR, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]),
  ]; 
  const pressureFieldTextures = [
    createTexture(gl, [gl.LINEAR, gl.LINEAR, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]),
    createTexture(gl, [gl.LINEAR, gl.LINEAR, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]),
  ];
  const fieldFramebuffers = [
    gl.createFramebuffer(), 
    gl.createFramebuffer(), 
  ];

  // non-alternating framebuffers
  const velocityResultTexture = createTexture(gl, [gl.LINEAR, gl.LINEAR, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]);
  const pressureResultTexture = createTexture(gl, [gl.LINEAR, gl.LINEAR, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]);
  const resultFramebuffer = gl.createFramebuffer();

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

    // textures
    [0, 1].forEach((i) => {
      gl.bindTexture(gl.TEXTURE_2D, velocityFieldTextures[i]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, textureWidth, textureHeight, 0, gl.RG, gl.FLOAT, null);
      
      gl.bindTexture(gl.TEXTURE_2D, pressureFieldTextures[i]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, textureWidth, textureHeight, 0, gl.RED, gl.FLOAT, null);
    });

    gl.bindTexture(gl.TEXTURE_2D, velocityResultTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, textureWidth, textureHeight, 0, gl.RG, gl.FLOAT, null);
    gl.bindTexture(gl.TEXTURE_2D, pressureResultTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, textureWidth, textureHeight, 0, gl.RED, gl.FLOAT, null);
    
    gl.bindTexture(gl.TEXTURE_2D, divergenceResultTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, textureWidth, textureHeight, 0, gl.RED, gl.FLOAT, null);
    
    // framebuffers
    let zeroes = new Float32Array([0, 0, 0, 0]);
    setupFramebuffer(gl, fieldFramebuffers[0], velocityFieldTextures[0], pressureFieldTextures[0]);
    gl.clearBufferfv(gl.COLOR, 0, zeroes); gl.clearBufferfv(gl.COLOR, 1, zeroes);
    setupFramebuffer(gl, fieldFramebuffers[1], velocityFieldTextures[1], pressureFieldTextures[1]);
    gl.clearBufferfv(gl.COLOR, 0, zeroes); gl.clearBufferfv(gl.COLOR, 1, zeroes);

    setupFramebuffer(gl, resultFramebuffer, velocityResultTexture, pressureResultTexture);
    gl.clearBufferfv(gl.COLOR, 0, zeroes);
    setupFramebuffer(gl, divergenceResultFramebuffer, divergenceResultTexture);
    gl.clearBufferfv(gl.COLOR, 0, zeroes);
  }
  setup();

  let step = 0;
  function update(deltaTime) {
    advect(deltaTime);
    diffuse(deltaTime);
    if (applyForce) {
      addForce(deltaTime);
    }
    project(deltaTime);
    setBoundaries();
  }

  const advectVertexArray = makeVertexArray(gl, [[clipSpaceBuffer, advectLocations.clipSpace, 2, gl.FLOAT]]);
  function advect(deltaTime) {
    gl.useProgram(advectProgram);

    gl.bindVertexArray(advectVertexArray);
    bindTextureToLocation(gl, advectLocations.velocityField, 0, velocityFieldTextures[step % 2]);
    bindTextureToLocation(gl, advectLocations.pressureField, 1, pressureFieldTextures[step % 2]);
    gl.uniform1f(advectLocations.deltaTime, deltaTime);
    gl.uniform2fv(advectLocations.dx, params.dx);

    setFramebuffer(gl, fieldFramebuffers[(step + 1) % 2], textureWidth, textureHeight);
    gl.clearBufferfv(gl.COLOR, 0, [0.0, 0.0, 0.0, 0.0]);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    ++step;
  }

  const copyFieldVertexArray = makeVertexArray(gl, [[clipSpaceBuffer, copyFieldLocations.clipSpace, 2, gl.FLOAT]]);
  const diffuseVertexArray = makeVertexArray(gl, [[pixelCoordBuffer, diffuseLocations.pixel, 2, gl.FLOAT]]);
  function diffuse(deltaTime) {
    console.log("diffuse()");
    // copy fields to result textures
    gl.useProgram(copyFieldProgram);

    gl.bindVertexArray(copyFieldVertexArray);
    bindTextureToLocation(gl, copyFieldLocations.velocityField, 0, velocityFieldTextures[step % 2]);
    bindTextureToLocation(gl, copyFieldLocations.pressureField, 1, pressureFieldTextures[step % 2]);

    setFramebuffer(gl, resultFramebuffer, textureWidth, textureHeight);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // bindTextureToLocation(gl, copyFieldLocations.velocityField, 0, velocityResultTexture);
    // bindTextureToLocation(gl, copyFieldLocations.pressureField, 1, pressureResultTexture);

    // setFramebuffer(gl, fieldFramebuffers[(step + 1) % 2], textureWidth, textureHeight);
    // gl.drawArrays(gl.TRIANGLES, 0, 6);

    // ++step;

    // diffusion algorithm
    gl.useProgram(diffuseProgram);

    gl.bindVertexArray(diffuseVertexArray);
    bindTextureToLocation(gl, diffuseLocations.velocityResult, 0, velocityResultTexture);
    bindTextureToLocation(gl, diffuseLocations.pressureResult, 1, pressureResultTexture);
    gl.uniform2f(diffuseLocations.textureDimensions, textureWidth, textureHeight);
    gl.uniform1f(diffuseLocations.deltaTime, deltaTime);
    gl.uniform2fv(diffuseLocations.dx, params.dx);

    for (let i = 0; i < 20; ++i) {
      bindTextureToLocation(gl, diffuseLocations.velocityField, 2, velocityFieldTextures[step % 2]);
      bindTextureToLocation(gl, diffuseLocations.pressureField, 3, pressureFieldTextures[step % 2]);
      
      setFramebuffer(gl, fieldFramebuffers[(step + 1) % 2], textureWidth, textureHeight);
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
    console.log("velocity:", velX, velY);

    gl.useProgram(applyForceProgram);

    setupBuffer(gl, forcePositionBuffer, new Float32Array([textureX, textureY]), gl.STATIC_DRAW);
    gl.bindVertexArray(addForceVertexArray);

    gl.uniform2f(applyForceLocations.textureDimensions, width, height);
    gl.uniform1f(applyForceLocations.splatRadius, Math.sqrt(velX**2 + velY**2) / simulationWidth);
    // gl.uniform1f(applyForceLocations.splatRadius, 10);
    gl.uniform2f(applyForceLocations.inputVelocity, velX, velY);
    // gl.uniform2f(applyForceLocations.inputVelocity, 1, 1);
    gl.uniform1f(applyForceLocations.deltaTime, deltaTime);
    
    setFramebuffer(gl, fieldFramebuffers[step % 2], textureWidth, textureHeight);

    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.drawArrays(gl.POINTS, 0, 1);
    gl.disable(gl.BLEND);
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
      display();
    }
  });
  document.addEventListener('mouseup', () => {
    mouseIsPressed = false;
    applyForce = false;
  });

  document.addEventListener('keypress', (event) => {
    if (event.key = ' ') {
      advect(0.0167);
      diffuse(0.0167);
      display();
    }
  });

  function project(deltaTime) {

  }

  function setBoundaries() {

  }

  const displayVertexArray = makeVertexArray(gl, [[clipSpaceBuffer, displayLocations.clipSpace, 2, gl.FLOAT]]);
  function display(print = false) {
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
    bindTextureToLocation(gl, displayLocations.velocityField, 0, velocityFieldTextures[step % 2]);
    bindTextureToLocation(gl, displayLocations.pressureField, 1, pressureFieldTextures[step % 2]);
    gl.uniform1i(displayLocations.mode, 0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport((canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
    
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
}

main();