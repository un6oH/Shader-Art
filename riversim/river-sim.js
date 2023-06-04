function main(sourceImages) {
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

  // creating programs
  console.log("creating draw texture program");
  const drawTextureProgram = createProgram(gl, CANVAS_VS, DRAW_TEXTURE_FS);
  const drawTextureLocations = createLocations(gl, drawTextureProgram, ["position"], 
  ["canvasDimensions", "source"]);
  
  console.log("creating set ground height program");
  const setGroundHeightProgram = createProgram(gl, TEXTURE_VS, SET_GROUND_HEIGHT_FS);
  const setGroundHeightLocations = createLocations(gl, setGroundHeightProgram, ["position"], 
  ["textureDimensions", "groundHeightTexture", "scale"]);

  console.log("creating add sources program");
  const addSourcesProgram = createProgram(gl, TEXTURE_VS, ADD_SOURCES_FS);
  const addSourcesLocations = createLocations(gl, addSourcesProgram, ["position"], 
  ["textureDimensions", "heightTexture", "heightn1Texture", "groundHeightTexture", "sourceTexture", "sourceHeight", "inputRate", "deltaTime"]);
  
  console.log("creating remove sinks program");
  const removeSinksProgram = createProgram(gl, TEXTURE_VS, ADD_SOURCES_FS);
  const removeSinksLocations = createLocations(gl, removeSinksProgram, ["position"], 
  ["textureDimensions", "heightTexture", "heightn1Texture", "groundHeightTexture", "sinkTexture", "sinkHeight", "outputRate", "deltaTime"]);

  console.log("creating set depth program");
  const setDepthProgram = createProgram(gl, TEXTURE_VS, SET_DEPTH_FS);
  const setDepthLocations = createLocations(gl, setDepthProgram, ["position"], 
  ["textureDimensions", "heightTexture", "groundHeightTexture"]);

  console.log("creating set alpha program");
  const setAlphaProgram = createProgram(gl, TEXTURE_VS, SET_ALPHA_FS);
  const setAlphaLocations = createLocations(gl, setAlphaProgram, ["position"], 
  ["textureDimensions", "depthTexture", "grav", "deltaTime", "distance"]);

  console.log("creating set beta program");
  const setBetaProgram = createProgram(gl, TEXTURE_VS, SET_BETA_FS);
  const setBetaLocations = createLocations(gl, setBetaProgram, ["position"], 
  ["textureDimensions", "heightn1Texture", "heightn2Texture", "damping"]);
  
  console.log("creating set depth sum program");
  const setDepthSumProgram = createProgram(gl, TEXTURE_VS, SET_DEPTH_SUM_FS);
  const setDepthSumLocations = createLocations(gl, setDepthSumProgram, ["position"], 
  ["textureDimensions", "depthTexture"]);

  console.log("creating solve height program");
  const solveHeightProgram = createProgram(gl, TEXTURE_VS, SOLVE_HEIGHT_FS);
  const solveHeightLocations = createLocations(gl, solveHeightProgram, ["position"], 
  ["textureDimensions", "alphaTexture", "betaTexture", "heightTexture", "depthSumTexture", "gamma"]);

  console.log("creating update height program");
  const updateHeightProgram = createProgram(gl, TEXTURE_VS, UPDATE_HEIGHT_FS);
  const updateHeightLocations = createLocations(gl, updateHeightProgram, ["position"], 
  ["textureDimensions", "newHeightTexture", "heightTexture"]);

  console.log("creating update velocity program");
  const updateVelocityProgram = createProgram(gl, TEXTURE_VS, UPDATE_VELOCITY_FS);
  const updateVelocityLocations = createLocations(gl, updateVelocityProgram, ["position"], 
  ["textureDimensions", "heightTexture", "velocityTexture", "grav", "distance"]);

  console.log("creating render program");
  const renderProgram = createProgram(gl, TEXTURE_VS, RENDER_FS);
  const renderLocations = createLocations(gl, renderProgram, ["position"], 
  ["textureDimensions", "heightTextuer", "groundHeightTexture"]);

  // initialise buffers
  const canvasCoordsBuffer = gl.createBuffer();
  const pixelCoordsBuffer = gl.createBuffer();

  // textures
  const heightTextures = [createTexture(gl, [null, null, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]), createTexture(gl, [null, null, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE])];
  const heightn1Textures = [createTexture(gl, [null, null, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]), createTexture(gl, [null, null, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE])];
  const heightATexture = createTexture(gl, [null, null, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]);
  const heightBTexture = createTexture(gl, [null, null, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]);
  const groundHeightTexture = createTexture(gl, [null, null, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]);
  const groundHeightSourceTexture = createTexture(gl, [null, null, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]);
  const sourceTexture = createTexture(gl, [null, null, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]);
  const sinkTexture = createTexture(gl, [null, null, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]);

  const depthTexture = createTexture(gl, [null, null, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]);
  const alphaTexture = createTexture(gl, [null, null, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]);
  const betaTexture = createTexture(gl, [null, null, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]);
  const depthSumTexture = createTexture(gl, [null, null, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]);
  const velocityTexture = createTexture(gl, [null, null, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]);

  // framebuffers
  const heightFramebuffers = [gl.createFramebuffer(), gl.createFramebuffer()];
  const heightAFramebuffer = gl.createFramebuffer();
  const heightBFramebuffer = gl.createFramebuffer();
  const groundHeightFramebuffer = gl.createFramebuffer();
  const depthFramebuffer = gl.createFramebuffer();
  const alphaFramebuffer = gl.createFramebuffer();
  const betaFramebuffer = gl.createFramebuffer();
  const depthSumFramebuffer = gl.createFramebuffer();
  const velocityFramebuffer = gl.createFramebuffer();

  let heightStep = 0;
  let currentIter = {
    heightTexture: heightATexture, 
    heightFramebuffer: heightBFramebuffer, 
  }
  let nextIter = {
    heightTexture: heightBTexture, 
    heightFramebuffer: heightAFramebuffer, 
  }

  const simulation = {};
  function setSimulation() {
    // constants
    simulation.textureDimensions = [256, 256];
    simulation.grav = 1;
    simulation.distance = 1;
    simulation.damping = 0;

    simulation.heightScale = 10;
    simulation.sourceHeight = 10;
    simulation.sinkHeight = 0;
    simulation.inputRate = 1;
    simulation.outputRate = 1;

    simulation.solveIterations = 20;

    // buffers
    setupBuffer(gl, canvasCoordsBuffer, new Float32Array([
      0, 0, canvas.width, 0, canvas.width, canvas.height, 
      0, 0, canvas.width, canvas.height, 0, canvas.height, 
    ]), gl.STATIC_DRAW);

    setupBuffer(gl, pixelCoordsBuffer, new Float32Array([
      0, 0, simulation.textureDimensions[0], 0, simulation.textureDimensions[0], simulation.textureDimensions[1], 
      0, 0, simulation.textureDimensions[0], simulation.textureDimensions[1], 0, simulation.textureDimensions[0], 
    ]), gl.STATIC_DRAW);

    // set storage for 1D fields
    [heightATexture, heightBTexture, groundHeightTexture, depthTexture, alphaTexture, betaTexture].forEach((texture) => {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, simulation.textureDimensions[0], simulation.textureDimensions[1], 0, gl.RED, gl.FLOAT, null);
    });
    // storage for 2D fields
    [depthSumTexture, velocityTexture].forEach((texture) => {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, simulation.textureDimensions[0], simulation.textureDimensions[1], 0, gl.RG, gl.FLOAT, null);
    });

    // set storage for image input textures
    gl.bindTexture(gl.TEXTURE_2D, groundHeightSourceTexture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceImages[0]);

    gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceImages[1]);

    gl.bindTexture(gl.TEXTURE_2D, sinkTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceImages[1]);

    // bind textures to framebuffers
    // height framebuffer
    for (let i = 0; i < 2; i++) {
      gl.bindTexture(gl.TEXTURE_2D, heightTextures[i]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, simulation.textureDimensions[0], simulation.textureDimensions[1], 0, gl.RED, gl.FLOAT, null);
      gl.bindTexture(gl.TEXTURE_2D, heightn1Textures[i]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, simulation.textureDimensions[0], simulation.textureDimensions[1], 0, gl.RED, gl.FLOAT, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, heightFramebuffers[i]);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, heightTextures[i], 0); 
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, heightn1Textures[i], 0); 
      gl.clearBufferfv(gl.COLOR, 0, new Float32Array([0, 0, 0, 0]));
      gl.clearBufferfv(gl.COLOR, 1, new Float32Array([0, 0, 0, 0]));
    }

    // other framebuffers
    setupFramebuffer(gl, heightAFramebuffer, heightATexture);
    setupFramebuffer(gl, heightBFramebuffer, heightBTexture);
    setupFramebuffer(gl, groundHeightFramebuffer, groundHeightTexture);
    setupFramebuffer(gl, depthFramebuffer, depthTexture);
    setupFramebuffer(gl, alphaFramebuffer, alphaTexture);
    setupFramebuffer(gl, betaFramebuffer, betaTexture);
    setupFramebuffer(gl, depthSumFramebuffer, depthSumTexture);
    setupFramebuffer(gl, velocityFramebuffer, velocityTexture);
  }

  function drawTexture(texture) {
    gl.useProgram(drawTextureProgram);

    setVertexShaderVariables(drawTextureLocations, canvasCoordsBuffer, [canvas.width, canvas.height]);
    gl.uniform1i(drawTextureLocations.source, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, groundHeightSourceTexture);

    setFramebuffer(gl, null, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  
  // create float ground height texture
  function setGroundHeightTexture() {
    gl.useProgram(setGroundHeightProgram);

    setVertexShaderVariables(setGroundHeightLocations, pixelCoordsBuffer, simulation.textureDimensions);
    gl.uniform1i(setGroundHeightLocations.groundHeightTexture, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, groundHeightSourceTexture);
    gl.uniform1f(setGroundHeightLocations.scale, simulation.heightScale);

    setFramebuffer(gl, groundHeightFramebuffer, ...simulation.textureDimensions);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function addSources(deltaTime) {
    gl.useProgram(addSourcesProgram);

    setVertexShaderVariables(addSourcesLocations, pixelCoordsBuffer, simulation.textureDimensions);
    bindTextureToLocation(gl, addSourcesLocations.heightTexture, 0, heightTextures[heightStep % 2]);
    bindTextureToLocation(gl, addSourcesLocations.heightn1Texture, 1, heightn1Textures[heightStep % 2]);
    bindTextureToLocation(gl, addSourcesLocations.groundHeightTexture, 2, groundHeightTexture);
    bindTextureToLocation(gl, addSourcesLocations.sourceTexture, 3, sourceTexture);
    gl.uniform1f(addSourcesLocations.sourceHeight, simulation.sourceHeight);
    gl.uniform1f(addSourcesLocations.inputRate, simulation.inputRate);
    gl.uniform1f(addSourcesLocations.deltaTime, deltaTime);

    heightStep++;
    setFramebuffer(gl, heightFramebuffers[heightStep % 2], ...simulation.textureDimensions);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function removeSinks(deltaTime) {
    gl.useProgram(removeSinksProgram);

    setVertexShaderVariables(removeSinksLocations, pixelCoordsBuffer, simulation.textureDimensions);
    bindTextureToLocation(gl, removeSinksLocations.heightTexture, 0, heightTextures[heightStep % 2]);
    bindTextureToLocation(gl, removeSinksLocations.heightn1Texture, 1, heightn1Textures[heightStep % 2]);
    bindTextureToLocation(gl, removeSinksLocations.groundHeightTexture, 2, groundHeightTexture);
    bindTextureToLocation(gl, removeSinksLocations.sourceTexture, 3, sourceTexture);
    gl.uniform1f(removeSinksLocations.sinkHeight, simulation.sinkHeight);
    gl.uniform1f(removeSinksLocations.outputRate, simulation.outputRate);
    gl.uniform1f(removeSinksLocations.deltaTime, deltaTime);

    heightStep++;

    setFramebuffer(gl, heightFramebuffers[heightStep % 2], ...simulation.textureDimensions);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function setDepth() {
    gl.useProgram(setDepthProgram);

    setVertexShaderVariables(setDepth, pixelCoordsBuffer, simulation.textureDimensions);
    bindTextureToLocation(gl, setDepthLocations.heightTexture, 0, heightTextures[heightStep % 2]);
    bindTextureToLocation(gl, setDepthLocations.groundHeightTexture, 1, groundHeightTexture);

    setFramebuffer(gl, depthFramebuffer, ...simulation.textureDimensions);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function setAlpha(deltaTime) {
    gl.useProgram(setAlphaProgram);

    setVertexShaderVariables(setAlphaLocations, pixelCoordsBuffer, simulation.textureDimensions);
    bindTextureToLocation(gl, setAlphaLocations.depthTexture, 0, depthTexture);
    gl.uniform1f(setAlphaLocations.grav, simulation.grav);
    gl.uniform1f(setAlphaLocations.deltaTime, deltaTime);
    gl.uniform1f(setAlphaLocations.distance, simulation.distance);

    setFramebuffer(gl, alphaFramebuffer, ...simulation.textureDimensions);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function setBeta() {
    gl.useProgram(setBetaProgram);

    setVertexShaderVariables(setBetaLocations, pixelCoordsBuffer, simulation.textureDimensions);
    bindTextureToLocation(gl, setBetaLocations.heightn1Texture, 0, heightTextures[heightStep % 2]);
    bindTextureToLocation(gl, setBetaLocations.heightn2Texture, 1, heightn1Textures[heightStep % 2]);
    gl.uniform1f(setBetaLocations.damping, simulation.damping);

    setFramebuffer(gl, betaFramebuffer, ...simulation.textureDimensions);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function setDepthSum() {
    gl.useProgram(setDepthSumProgram);

    setVertexShaderVariables(setDepthSumLocations, pixelCoordsBuffer, simulation.textureDimensions);
    bindTextureToLocation(gl, setDepthSumLocations.depthTexture, 0, depthTexture);

    setFramebuffer(gl, depthSumFramebuffer, ...simulation.textureDimensions);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function solveHeight(deltaTime) {
    gl.useProgram(solveHeightProgram);

    setVertexShaderVariables(solveHeightLocations, pixelCoordsBuffer, simulation.textureDimensions);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, heightFramebuffers[heightStep % 2]);
    gl.bindTexture(gl.TEXTURE_2D, heightATexture);
    gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RED, 0, 0, ...simulation.textureDimensions, 0);
    gl.bindTexture(gl.TEXTURE_2D, heightBTexture);
    gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RED, 0, 0, ...simulation.textureDimensions, 0);

    bindTextureToLocation(gl, solveHeightLocations.alphaTexture, 0, alphaTexture);
    bindTextureToLocation(gl, solveHeightLocations.betaTexture, 1, betaTexture);
    bindTextureToLocation(gl, solveHeightLocations.depthSumTexture, 3, depthSumTexture);
    let gamma = simulation.grav * (deltaTime**2) / (2 * simulation.distance**2);
    gl.uniform1f(solveHeightLocations.gamma, gamma);

    for (let i = 0; i < simulation.solveIterations; ++i) {
      bindTextureToLocation(gl, solveHeightLocations.heightTexture, 2, currentIter.heightTexture);

      setFramebuffer(gl, currentIter.heightFramebuffer, ...simulation.textureDimensions);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      let temp = currentIter;
      currentIter = nextIter;
      nextIter = currentIter;
    }
  }

  function incHeight() {
    gl.useProgram(updateHeightProgram);

    setVertexShaderVariables(updateHeightLocations, pixelCoordsBuffer, simulation.textureDimensions);
    bindTextureToLocation(gl, updateHeightLocations.newHeightTexture, 0, nextIter.heightTexture);
    bindTextureToLocation(gl, updateHeightLocations.heightTexture, 1, heightTextures[heightStep % 2]);

    heightStep++;

    setFramebuffer(gl, heightFramebuffers[heightStep % 2]);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function updateHeight(deltaTime) {
    // addSources(deltaTime);
    // removeSinks(deltaTime);
    setDepth();
    // setAlpha(deltaTime);
    // setBeta();
    // setDepthSum();
    // solveHeight(deltaTime);
    // incHeight();
  }
  
  function render() {
    gl.useProgram(renderProgram);

    setVertexShaderVariables(renderLocations, canvasCoordsBuffer, [canvas.width, canvas.height]);
    bindTextureToLocation(gl, renderProgram.heightTexture, 0, heightTextures[heightStep % 2]);
    bindTextureToLocation(gl, renderProgram.groundHeightTexture, 0, groundHeightTexture);

    setFramebuffer(gl, null, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function step(deltaTime) {
    updateHeight(deltaTime);
    drawTexture(groundHeightTexture);
  }
  
  setSimulation();
  setGroundHeightTexture();
  step(0.05);

  let then = 0
  function loop(time) {
    if (!play) {
      console.log("-+- STOPPED LOOP -+-\n\n\n")
      return;
    }
    let deltaTime = time - then;
    then = time;

    // step(deltaTime * 0.001);
    step(0.05);
    
    requestAnimationFrame(loop);
  }

  let play = false;
  function playPause() {
    play = !play;
    if (play) {
      console.log("\n\n-+- STARTED LOOP -+-")
      let time = performance.now();
      then = time;
      loop(time);
    }
  }

  function keyPress(event) {
    if (event.key == ' ') {
      playPause();
    } else if (event.key == 'Enter') {
      showHideSettings();
    }
  }

  document.addEventListener("keypress", keyPress);
  

  function setVertexShaderVariables(locations, buffer, dimensions) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(locations.position);
    gl.vertexAttribPointer(locations.position, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2fv(locations.textureDimensions, new Float32Array(dimensions));
  }
}


function loadImage(url, callback) {
  let image = new Image();
  image.src = url;
  image.onload = callback;
  return image;
}

function loadImages(urls, callback) {
  let images = [];
  let imagesToLoad = urls.length;

  const onImageLoad = () => {
    --imagesToLoad;

    if (imagesToLoad == 0) {
      callback(images);
    }
  }

  for (let i = 0; i < imagesToLoad; ++i) {
    let image = loadImage(urls[i], onImageLoad);
    images.push(image);
  }
}

function setup() {
  loadImages([
    "groundheighttexture.png", 
    "sources.png",
    "sinks.png",
  ], main);
}


setup();