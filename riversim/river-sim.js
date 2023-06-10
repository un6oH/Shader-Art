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
  ["canvasDimensions", "source", "scale"]);
  
  console.log("creating set ground height program");
  const setGroundHeightProgram = createProgram(gl, TEXTURE_VS, SET_GROUND_HEIGHT_FS);
  const setGroundHeightLocations = createLocations(gl, setGroundHeightProgram, ["position"], 
  ["textureDimensions", "groundHeightTexture", "scale"]);

  console.log("creating add sources program");
  const addSourcesProgram = createProgram(gl, TEXTURE_VS, ADD_SOURCES_FS);
  const addSourcesLocations = createLocations(gl, addSourcesProgram, ["position"], 
  ["textureDimensions", "heightTexture", "groundHeightTexture", "sourceTexture", "sourceHeight", "inputRate", "deltaTime"]);
  
  console.log("creating remove sinks program");
  const removeSinksProgram = createProgram(gl, TEXTURE_VS, ADD_SOURCES_FS);
  const removeSinksLocations = createLocations(gl, removeSinksProgram, ["position"], 
  ["textureDimensions", "heightTexture", "groundHeightTexture", "sinkTexture", "sinkHeight", "outputRate", "deltaTime"]);

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
  const renderProgram = createProgram(gl, CANVAS_VS, RENDER_FS);
  const renderLocations = createLocations(gl, renderProgram, ["position"], 
  ["canvasDimensions", "heightTexture", "groundHeightTexture", "scale"]);

  // initialise buffers
  const canvasCoordsBuffer = gl.createBuffer();
  const pixelCoordsBuffer = gl.createBuffer();

  // textures
  const heightTextures = [createTexture(gl, [gl.NEAREST, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]), createTexture(gl, [gl.NEAREST, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE])];
  const heightn1Textures = [createTexture(gl, [gl.NEAREST, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]), createTexture(gl, [gl.NEAREST, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE])];
  const solveHeightTextures = [createTexture(gl, [gl.NEAREST, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]), createTexture(gl, [gl.NEAREST, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE])];
  const groundHeightTexture = createTexture(gl, [gl.NEAREST, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]);
  const groundHeightSourceTexture = createTexture(gl, [gl.NEAREST, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]);
  const sourceTexture = createTexture(gl, [gl.NEAREST, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]);
  const sinkTexture = createTexture(gl, [gl.NEAREST, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]);

  const depthTexture = createTexture(gl, [gl.NEAREST, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]);
  const alphaTexture = createTexture(gl, [gl.NEAREST, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]);
  const betaTexture = createTexture(gl, [gl.NEAREST, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]);
  const depthSumTexture = createTexture(gl, [gl.NEAREST, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]);
  const velocityTexture = createTexture(gl, [gl.NEAREST, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]);

  // framebuffers
  const heightFramebuffers = [gl.createFramebuffer(), gl.createFramebuffer()];
  const heightn1Framebuffers = [gl.createFramebuffer(), gl.createFramebuffer()];
  const solveHeightFramebuffers = [gl.createFramebuffer(), gl.createFramebuffer()];
  const groundHeightFramebuffer = gl.createFramebuffer();
  const depthFramebuffer = gl.createFramebuffer();
  const alphaFramebuffer = gl.createFramebuffer();
  const betaFramebuffer = gl.createFramebuffer();
  const depthSumFramebuffer = gl.createFramebuffer();
  const velocityFramebuffer = gl.createFramebuffer();

  let heightStep = 0;

  const simulation = {};
  function setSimulation() {
    // constants
    simulation.textureDimensions = [256, 256];
    simulation.grav = 10;
    simulation.distance = 0.05;
    simulation.damping = 0;

    simulation.heightScale = 10;
    simulation.sourceHeight = 15;
    simulation.sinkHeight = 0;
    simulation.inputRate = 1;
    simulation.outputRate = 1;

    simulation.solveIterations = 40;
    simulation.input = false;
    simulation.output = false;

    simulation.outputTexture = 0;
    simulation.render = true;

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
    [groundHeightTexture, depthTexture, alphaTexture, betaTexture].forEach((texture) => {
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
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceImages[2]);

    // bind textures to framebuffers
    // height framebuffers
    for (let i = 0; i < 2; i++) {
      gl.bindTexture(gl.TEXTURE_2D, heightTextures[i]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, simulation.textureDimensions[0], simulation.textureDimensions[1], 0, gl.RED, gl.FLOAT, null);
      setupFramebuffer(gl, heightFramebuffers[i], heightTextures[i]);
      gl.clearBufferfv(gl.COLOR, 0, new Float32Array([0, 0, 0, 0]));
      
      gl.bindTexture(gl.TEXTURE_2D, heightn1Textures[i]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, simulation.textureDimensions[0], simulation.textureDimensions[1], 0, gl.RED, gl.FLOAT, null);
      setupFramebuffer(gl, heightn1Framebuffers[i], heightn1Textures[i]);
      gl.clearBufferfv(gl.COLOR, 0, new Float32Array([0, 0, 0, 0]));

      gl.bindTexture(gl.TEXTURE_2D, solveHeightTextures[i]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, simulation.textureDimensions[0], simulation.textureDimensions[1], 0, gl.RED, gl.FLOAT, null);
      setupFramebuffer(gl, solveHeightFramebuffers[i], solveHeightTextures[i]);
      gl.clearBufferfv(gl.COLOR, 0, new Float32Array([0, 0, 0, 0]));
    }

    // other framebuffers
    setupFramebuffer(gl, groundHeightFramebuffer, groundHeightTexture);
    setupFramebuffer(gl, depthFramebuffer, depthTexture);
    setupFramebuffer(gl, alphaFramebuffer, alphaTexture);
    setupFramebuffer(gl, betaFramebuffer, betaTexture);
    setupFramebuffer(gl, depthSumFramebuffer, depthSumTexture);
    setupFramebuffer(gl, velocityFramebuffer, velocityTexture);

    setGroundHeightTexture();
    step(0);

    parameterInputs.forEach((input, i) => {
      input.value = simulation[parameterNames[i]];
    });
    inputToggle.textContent = "Input: off";
    outputToggle.textContent = "Output: off";

    play = false;

    console.log("setSimulation() initialised");
  }

  function drawTexture() {
    // console.log("drawTexture()");
    gl.useProgram(drawTextureProgram);

    setVertexShaderVariables(drawTextureLocations, false);

    let texture = [
      heightTextures[heightStep % 2], 
      depthTexture, 
      velocityTexture, 
      alphaTexture, 
      betaTexture, 
      depthSumTexture, 
      groundHeightTexture, 
      sourceTexture, 
      sinkTexture, 
    ][simulation.outputTexture];
    let scale = [10, 10, 10, 1, 10, 20, simulation.heightScale, 1, 1][simulation.outputTexture];
    bindTextureToLocation(gl, drawTextureLocations.source, 0, texture);
    gl.uniform1f(drawTextureLocations.scale, scale);

    setFramebuffer(gl, null, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  
  // create float ground height texture
  function setGroundHeightTexture() {
    // console.log("setGroundHeightTexture()");
    gl.useProgram(setGroundHeightProgram);

    setVertexShaderVariables(setGroundHeightLocations, true);
    bindTextureToLocation(gl, setGroundHeightLocations.groundHeightTexture, 0, groundHeightSourceTexture);
    gl.uniform1f(setGroundHeightLocations.scale, simulation.heightScale);

    setFramebuffer(gl, groundHeightFramebuffer, ...simulation.textureDimensions);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function addSources(deltaTime) {
    // console.log("addSources()");
    gl.useProgram(addSourcesProgram);

    setVertexShaderVariables(addSourcesLocations, true);
    bindTextureToLocation(gl, addSourcesLocations.heightTexture, 0, heightTextures[heightStep % 2]);
    bindTextureToLocation(gl, addSourcesLocations.groundHeightTexture, 2, groundHeightTexture);
    bindTextureToLocation(gl, addSourcesLocations.sourceTexture, 3, sourceTexture);
    gl.uniform1f(addSourcesLocations.sourceHeight, simulation.sourceHeight);
    gl.uniform1f(addSourcesLocations.inputRate, simulation.inputRate);
    gl.uniform1f(addSourcesLocations.deltaTime, deltaTime);

    setFramebuffer(gl, heightFramebuffers[(heightStep + 1) % 2], ...simulation.textureDimensions);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    bindTextureToLocation(gl, addSourcesLocations.heightTexture, 0, heightn1Textures[heightStep % 2]);
    setFramebuffer(gl, heightn1Framebuffers[(heightStep + 1) % 2], ...simulation.textureDimensions);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    heightStep++;
  }

  function removeSinks(deltaTime) {
    // console.log("removeSinks()");
    gl.useProgram(removeSinksProgram);

    setVertexShaderVariables(removeSinksLocations, true);
    bindTextureToLocation(gl, removeSinksLocations.heightTexture, 0, heightTextures[heightStep % 2]);
    bindTextureToLocation(gl, removeSinksLocations.groundHeightTexture, 2, groundHeightTexture);
    bindTextureToLocation(gl, removeSinksLocations.sourceTexture, 3, sourceTexture);
    gl.uniform1f(removeSinksLocations.sinkHeight, simulation.sinkHeight);
    gl.uniform1f(removeSinksLocations.outputRate, simulation.outputRate);
    gl.uniform1f(removeSinksLocations.deltaTime, deltaTime);

    setFramebuffer(gl, heightFramebuffers[(heightStep + 1) % 2], ...simulation.textureDimensions);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    bindTextureToLocation(gl, removeSinksLocations.heightTexture, 0, heightn1Textures[heightStep % 2]);
    setFramebuffer(gl, heightn1Framebuffers[(heightStep + 1) % 2], ...simulation.textureDimensions);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    heightStep++;
  }

  function setDepth() {
    // console.log("setDepth()");
    gl.useProgram(setDepthProgram);

    setVertexShaderVariables(setDepthLocations, true);
    bindTextureToLocation(gl, setDepthLocations.heightTexture, 0, heightTextures[heightStep % 2]);
    bindTextureToLocation(gl, setDepthLocations.groundHeightTexture, 1, groundHeightTexture);

    setFramebuffer(gl, depthFramebuffer, ...simulation.textureDimensions);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function setAlpha(deltaTime) {
    // console.log("setAlpha()");
    gl.useProgram(setAlphaProgram);

    setVertexShaderVariables(setAlphaLocations, true);
    bindTextureToLocation(gl, setAlphaLocations.depthTexture, 0, depthTexture);
    gl.uniform1f(setAlphaLocations.grav, simulation.grav);
    gl.uniform1f(setAlphaLocations.deltaTime, deltaTime);
    gl.uniform1f(setAlphaLocations.distance, simulation.distance);

    setFramebuffer(gl, alphaFramebuffer, ...simulation.textureDimensions);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function setBeta() {
    // console.log("setBeta()");
    gl.useProgram(setBetaProgram);

    setVertexShaderVariables(setBetaLocations, true);
    bindTextureToLocation(gl, setBetaLocations.heightn1Texture, 0, heightTextures[heightStep % 2]);
    bindTextureToLocation(gl, setBetaLocations.heightn2Texture, 1, heightn1Textures[heightStep % 2]);
    gl.uniform1f(setBetaLocations.damping, simulation.damping);

    setFramebuffer(gl, betaFramebuffer, ...simulation.textureDimensions);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function setDepthSum() {
    // console.log("setDepthSum()");
    gl.useProgram(setDepthSumProgram);

    setVertexShaderVariables(setDepthSumLocations, true);
    bindTextureToLocation(gl, setDepthSumLocations.depthTexture, 0, depthTexture);

    setFramebuffer(gl, depthSumFramebuffer, ...simulation.textureDimensions);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function solveHeight(deltaTime) {
    // console.log("solveHeight()");
    gl.useProgram(solveHeightProgram);

    setVertexShaderVariables(solveHeightLocations, true);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, heightFramebuffers[heightStep % 2]);
    gl.bindTexture(gl.TEXTURE_2D, solveHeightTextures[0]);
    gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RED, 0, 0, ...simulation.textureDimensions, 0);
    gl.bindTexture(gl.TEXTURE_2D, solveHeightTextures[1]);
    gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RED, 0, 0, ...simulation.textureDimensions, 0);

    bindTextureToLocation(gl, solveHeightLocations.alphaTexture, 0, alphaTexture);
    bindTextureToLocation(gl, solveHeightLocations.betaTexture, 1, betaTexture);
    bindTextureToLocation(gl, solveHeightLocations.depthSumTexture, 3, depthSumTexture);
    let gamma = simulation.grav * (deltaTime**2) / (4 * simulation.distance**2);
    gl.uniform1f(solveHeightLocations.gamma, gamma);

    for (let i = 0; i < simulation.solveIterations; ++i) {
      bindTextureToLocation(gl, solveHeightLocations.heightTexture, 2, solveHeightTextures[i % 2]);

      setFramebuffer(gl, solveHeightFramebuffers[(i + 1) % 2], ...simulation.textureDimensions);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  }

  function incHeight() {
    // console.log("incHeight()");
    gl.bindFramebuffer(gl.FRAMEBUFFER, solveHeightFramebuffers[simulation.solveIterations % 2]);
    gl.bindTexture(gl.TEXTURE_2D, heightTextures[(heightStep + 1) % 2]);
    gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RED, 0, 0, ...simulation.textureDimensions, 0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, heightFramebuffers[heightStep % 2]);
    gl.bindTexture(gl.TEXTURE_2D, heightn1Textures[(heightStep + 1) % 2]);
    gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RED, 0, 0, ...simulation.textureDimensions, 0);

    heightStep++;
  }

  function updateHeight(deltaTime) {
    if (simulation.input) addSources(deltaTime);
    if (simulation.output) removeSinks(deltaTime);
    setDepth();
    setAlpha(deltaTime);
    setBeta();
    setDepthSum();
    solveHeight(deltaTime);
    incHeight();
  }
  
  function render() {
    gl.useProgram(renderProgram);

    setVertexShaderVariables(renderLocations, false);
    bindTextureToLocation(gl, renderProgram.heightTexture, 0, heightTextures[heightStep % 2]);
    bindTextureToLocation(gl, renderProgram.groundHeightTexture, 0, groundHeightTexture);
    gl.uniform1f(renderLocations.scale, simulation.heightScale);

    setFramebuffer(gl, null, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function step(deltaTime) {
    updateHeight(deltaTime);
    if (simulation.render) {
      render();
    } else {
      drawTexture();
    }
  }

  let then = 0
  function loop(time) {
    if (!play) {
      console.log("-+- STOPPED LOOP -+-\n\n\n")
      return;
    }
    let deltaTime = time - then;
    then = time;

    console.log("loop() step");
    step(deltaTime * 0.001);
    
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
    switch(event.key) {
      case ' ':
        playPause();
        break;
      case "Enter":
        console.log("single step");
        step(1 / 60);
        break;
      default:

    }
  }

  function setVertexShaderVariables(locations, texture) {
    gl.bindBuffer(gl.ARRAY_BUFFER, texture ? pixelCoordsBuffer : canvasCoordsBuffer);
    gl.enableVertexAttribArray(locations.position);
    gl.vertexAttribPointer(locations.position, 2, gl.FLOAT, false, 0, 0);

    if (texture) {
      gl.uniform2fv(locations.textureDimensions, simulation.textureDimensions);
    } else {
      gl.uniform2f(locations.canvasDimensions, canvas.width, canvas.height);
    }
  }

  // GUI
  // buttons
  const resetButton = document.querySelector("#reset-button");
  resetButton.addEventListener("click", setSimulation);
  const inputToggle = document.querySelector("#input-toggle");
  inputToggle.addEventListener("click", () => {
    simulation.input = !simulation.input;
    inputToggle.textContent = "Input: " + (simulation.input ? "on" : "off");
  })
  const outputToggle = document.querySelector("#output-toggle");
  outputToggle.addEventListener("click", () => {
    simulation.output = !simulation.output;
    outputToggle.textContent = "Output: " + (simulation.output ? "on" : "off");
  })
  // output selector
  const textureSelect = document.querySelector("#texture-select");
  const textureDict = {
    height: 0, 
    depth: 1, 
    velocity: 2, 
    alpha: 3, 
    beta: 4, 
    depthsum: 5, 
    ground: 6, 
    sources: 7, 
    sinks: 8, 
  };
  textureSelect.addEventListener("input", event => {
    let value = textureSelect.value;
    if (textureSelect.value == "render") {
      simulation.render = true;
      render();
      return;
    } 
    simulation.render = false;
    simulation.outputTexture = textureDict[value];
    drawTexture();
  })

  // parameter container
  const parameterContainer = document.querySelector("#parameter-container");
  const parameterNames = [
    "grav", 
    "distance", 
    "damping", 
    "heightScale", 
    "sourceHeight", 
    "sinkHeight", 
    "inputRate",
    "outputRate", 
  ];
  const parameterSteps = [0.1, 0.05, 0.00001, 1, 1, 1, 0.1, 0.1];
  for (let i = 0; i < parameterNames.length; i++) {
    let p = document.createElement("p");
    p.appendChild(document.createTextNode(parameterNames[i]));
    parameterContainer.appendChild(p);

    let input = document.createElement("input");
    input.id = parameterNames[i];
    input.step = parameterSteps[i];
    input.type = "number";
    parameterContainer.appendChild(input);
  }
  const parameterInputs = new Array(8).fill(0).map((v, i) => document.getElementById(parameterNames[i]));
  parameterInputs.forEach((input, i) => {
    input.addEventListener("input", event => {
      simulation[parameterNames[i]] = parseFloat(event.data);
    });
  });

  document.addEventListener("keypress", keyPress);

  setSimulation();
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