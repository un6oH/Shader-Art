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
  ["canvasDimensions", "source", "scale", "normalise"]);
  
  console.log("creating set ground height program");
  const setGroundHeightProgram = createProgram(gl, TEXTURE_VS, SET_GROUND_HEIGHT_FS);
  const setGroundHeightLocations = createLocations(gl, setGroundHeightProgram, ["position"], 
  ["textureDimensions", "groundHeightTexture", "scale"]);

  console.log("creating add sources program");
  const addSourcesProgram = createProgram(gl, TEXTURE_VS, ADD_SOURCES_FS);
  const addSourcesLocations = createLocations(gl, addSourcesProgram, ["position"], 
  ["textureDimensions", "heightTexture", "groundHeightTexture", "sourceTexture", "depthTexture", "sourceHeight", "inputRate", "deltaTime"]);
  
  console.log("creating remove sinks program");
  const removeSinksProgram = createProgram(gl, TEXTURE_VS, ADD_SOURCES_FS);
  const removeSinksLocations = createLocations(gl, removeSinksProgram, ["position"], 
  ["textureDimensions", "heightTexture", "groundHeightTexture", "sinkTexture", "depthTexture", "sinkHeight", "outputRate", "deltaTime"]);

  console.log("creating set depth program");
  const setDepthProgram = createProgram(gl, TEXTURE_VS, SET_DEPTH_FS);
  const setDepthLocations = createLocations(gl, setDepthProgram, ["position"], 
  ["textureDimensions", "heightTexture", "groundHeightTexture"]);

  console.log("creating set alpha program");
  const setAlphaProgram = createProgram(gl, TEXTURE_VS, SET_ALPHA_FS);
  const setAlphaLocations = createLocations(gl, setAlphaProgram, ["position"], 
  ["textureDimensions", "depthTexture", "grav", "deltaTime", "unit"]);

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

  console.log("creating calc excess volume program");
  const calcExcessVolumeProgram = createProgram(gl, TEXTURE_VS, CALC_EXCESS_VOLUME_FS);
  const calcExcessVolumeLocations = createLocations(gl, calcExcessVolumeProgram, ["position"], 
  ["textureDimensions", "heightTexture", "heightn1Texture"]);

  console.log("creating set connected volumes program");
  const setConnectedVolumesProgram = createProgram(gl, TEXTURE_VS, SET_CONNECTED_VOLUMES_FS);
  const setConnectedVolumesLocations = createLocations(gl, setConnectedVolumesProgram, ["position"], 
  ["textureDimensions", "heightTexture", "groundHeightTexture"]);

  console.log("creating propagate excess volume program");
  const propagateExcessVolumeProgram = createProgram(gl, TEXTURE_VS, PROPAGATE_EXCESS_VOLUME_FS);
  const propagateExcessVolumeLocations = createLocations(gl, propagateExcessVolumeProgram, ["position"], 
  ["textureDimensions", "connectedVolumesTexture", "excessTexture", "weightOffset"]);

  console.log("creating correct volume program");
  const correctVolumeProgram = createProgram(gl, TEXTURE_VS, CORRECT_VOLUME_FS);
  const correctVolumeLocations = createLocations(gl, correctVolumeProgram, ["position"], 
  ["textureDimensions", "heightTexture", "excessTexture"]);

  console.log("creating update velocity program");
  const updateVelocityProgram = createProgram(gl, TEXTURE_VS, UPDATE_VELOCITY_FS);
  const updateVelocityLocations = createLocations(gl, updateVelocityProgram, ["position"], 
  ["textureDimensions", "heightTexture", "velocityTexture", "grav", "unit", "deltaTime"]);

  console.log("creating render program");
  const renderProgram = createProgram(gl, CANVAS_VS, RENDER_FS);
  const renderLocations = createLocations(gl, renderProgram, ["position"], 
  // ["canvasDimensions", "heightTexture", "groundHeightTexture", "normalMapTexture", "scale"]);
  ["canvasDimensions", "depthTexture", "groundHeightTexture", "normalMapTexture", "scale"]);

  console.log("creating set normal map program");
  const setNormalMapProgram = createProgram(gl, TEXTURE_VS, SET_NORMAL_MAP_FS);
  const setNormalMapLocations = createLocations(gl, setNormalMapProgram, ["position"], 
  ["textureDimensions", "heightTexture", "unit"]);

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
  const velocityTextures = [createTexture(gl, [gl.NEAREST, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]), createTexture(gl, [gl.NEAREST, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE])];
  const excessVolumeTextures = [createTexture(gl, [gl.NEAREST, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]), createTexture(gl, [gl.NEAREST, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE])];
  const connectedVolumesTexture = createTexture(gl, [gl.NEAREST, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]);

  const normalMapTexture = createTexture(gl, [gl.LINEAR, gl.LINEAR, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]);

  // framebuffers
  const heightFramebuffers = [gl.createFramebuffer(), gl.createFramebuffer()];
  const heightn1Framebuffers = [gl.createFramebuffer(), gl.createFramebuffer()];
  const solveHeightFramebuffers = [gl.createFramebuffer(), gl.createFramebuffer()];
  const groundHeightFramebuffer = gl.createFramebuffer();
  const depthFramebuffer = gl.createFramebuffer();
  const alphaFramebuffer = gl.createFramebuffer();
  const betaFramebuffer = gl.createFramebuffer();
  const depthSumFramebuffer = gl.createFramebuffer();
  const velocityFramebuffers = [gl.createFramebuffer(), gl.createFramebuffer()];
  const excessVolumeFramebuffers = [gl.createFramebuffer(), gl.createFramebuffer()];
  const connectedVolumesFramebuffer = gl.createFramebuffer();
  const normalMapFramebuffer = gl.createFramebuffer();

  let heightStep = 0;
  let velocityStep = 0;

  // parameter container
  const parameterContainer = document.querySelector("#parameter-container");
  const parameterNames = [
    "grav", 
    "unit", 
    "damping", 
    "heightScale", 
    "sourceHeight", 
    "sinkHeight", 
    "inputRate",
    "outputRate", 
    "timeWarp", 
    "weightOffset"
  ];
  const parameterAttributes = [ // default, step, min, max
    [10, 0.1, 0],
    [100 / sourceImages[0].naturalWidth, 0.01, 0.01],
    [0, 0.001, 0],
    [10, 1, 1],
    [10, 1, 1],
    [0, 1, 0],
    [1, 1, 0],
    [1, 1, 0],
    [1, 0.5, 0],
    [0.0, 0.001, -1],
  ];
  
  for (let i = 0; i < parameterNames.length; i++) {
    let p = document.createElement("p");
    p.appendChild(document.createTextNode(parameterNames[i]));
    parameterContainer.appendChild(p);

    let input = document.createElement("input");
    input.id = parameterNames[i];
    input.type = "number";
    input.value = parameterAttributes[i][0];
    input.step = parameterAttributes[i][1];
    input.min = parameterAttributes[i][2];
    parameterContainer.appendChild(input);
  }
  const parameterInputs = new Array(parameterNames.length).fill(0).map((v, i) => document.getElementById(parameterNames[i]));
  parameterInputs.forEach((input, i) => {
    function setSimulationParameter() {
      let value = parseFloat(input.value);
      simulation[parameterNames[i]] = value;
      console.log(parameterNames[i], "set to", value);
    }

    input.addEventListener("input", setSimulationParameter);
  });

  const simulation = {};
  simulation.input = true;
  simulation.output = true;
  simulation.correctVolume = false;

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
  const correctVolumeToggle = document.querySelector("#correct-volume-toggle");
  correctVolumeToggle.addEventListener("click", () => {
    simulation.correctVolume = !simulation.correctVolume;
    correctVolumeToggle.textContent = "Correct volume: " + (simulation.correctVolume ? "on" : "off");
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
    normal: 9, 
    excess: 10, 
    connected: 11, 
    heightn1: 12, 
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

  document.addEventListener("keypress", keyPress);
  function setSimulation() {
    simulation.textureDimensions = [sourceImages[0].naturalWidth, sourceImages[0].naturalHeight];

    parameterInputs.forEach((input, i) => {
      simulation[parameterNames[i]] = input.value;
      console.log(parameterNames[i], "set to", input.value);
    });
    inputToggle.textContent = "Input: " + (simulation.input ? "on" : "off");
    outputToggle.textContent = "Output: " + (simulation.output ? "on" : "off");

    simulation.solveIterations = 20;
    simulation.excessVolumePropagationRadius = 100;

    simulation.outputTexture = textureDict[textureSelect.value];
    simulation.render = textureSelect.value == "render";
    simulation.step = 0;

    heightStep = 0;
    velocityStep = 0;

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
    // storage for depthSumTexture
    gl.bindTexture(gl.TEXTURE_2D, depthSumTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, simulation.textureDimensions[0], simulation.textureDimensions[1], 0, gl.RG, gl.FLOAT, null);

    // storage for connectedVolumesTexture
    gl.bindTexture(gl.TEXTURE_2D, connectedVolumesTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, simulation.textureDimensions[0], simulation.textureDimensions[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    // set storage for image input textures
    gl.bindTexture(gl.TEXTURE_2D, groundHeightSourceTexture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceImages[0]);

    gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceImages[1]);

    gl.bindTexture(gl.TEXTURE_2D, sinkTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceImages[2]);

    // normal map
    gl.bindTexture(gl.TEXTURE_2D, normalMapTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, ...simulation.textureDimensions, 0, gl.RGBA, gl.FLOAT, null);

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

      gl.bindTexture(gl.TEXTURE_2D, velocityTextures[i]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, simulation.textureDimensions[0], simulation.textureDimensions[1], 0, gl.RG, gl.FLOAT, null);
      setupFramebuffer(gl, velocityFramebuffers[i], velocityTextures[i]);
      gl.clearBufferfv(gl.COLOR, 0, new Float32Array([0, 0, 0, 0]));

      gl.bindTexture(gl.TEXTURE_2D, excessVolumeTextures[i]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, simulation.textureDimensions[0], simulation.textureDimensions[1], 0, gl.RED, gl.FLOAT, null);
      setupFramebuffer(gl, excessVolumeFramebuffers[i], excessVolumeTextures[i]);
      gl.clearBufferfv(gl.COLOR, 0, new Float32Array([0, 0, 0, 0]));
    }

    // other framebuffers
    setupFramebuffer(gl, groundHeightFramebuffer, groundHeightTexture);
    setupFramebuffer(gl, depthFramebuffer, depthTexture);
    setupFramebuffer(gl, alphaFramebuffer, alphaTexture);
    setupFramebuffer(gl, betaFramebuffer, betaTexture);
    setupFramebuffer(gl, depthSumFramebuffer, depthSumTexture);
    setupFramebuffer(gl, connectedVolumesFramebuffer, connectedVolumesTexture);
    setupFramebuffer(gl, normalMapFramebuffer, normalMapTexture);

    setGroundHeightTexture();
    setNormalMap();
    step(0);

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
      velocityTextures[velocityStep % 2], 
      alphaTexture, 
      betaTexture, 
      depthSumTexture, 
      groundHeightTexture, 
      sourceTexture, 
      sinkTexture, 
      normalMapTexture, 
      excessVolumeTextures[0], 
      connectedVolumesTexture, 
      heightn1Textures[heightStep % 2], 
    ][simulation.outputTexture];
    let props = [ // scale, zero-centred
      // [simulation.heightScale * 2, false], 
      // [simulation.heightScale * 2, false], 
      [1, false], 
      [1, false], 
      [1000, true], 
      [1, false], 
      [simulation.heightScale * 2, false], 
      [simulation.heightScale * 2, false], 
      [simulation.heightScale * 2, false], 
      [1, false], 
      [1, false], 
      [1, true], 
      [0.01, true], 
      [1, false], 
      [simulation.heightScale * 2, false], 
    ][simulation.outputTexture];
    bindTextureToLocation(gl, drawTextureLocations.source, 0, texture);
    gl.uniform1f(drawTextureLocations.scale, props[0]);
    gl.uniform1f(drawTextureLocations.normalise, props[1]);

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
    bindTextureToLocation(gl, addSourcesLocations.groundHeightTexture, 1, groundHeightTexture);
    bindTextureToLocation(gl, addSourcesLocations.sourceTexture, 2, sourceTexture);
    bindTextureToLocation(gl, addSourcesLocations.depthTexture, 3, depthTexture);
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
    bindTextureToLocation(gl, removeSinksLocations.groundHeightTexture, 1, groundHeightTexture);
    bindTextureToLocation(gl, removeSinksLocations.sinkTexture, 2, sinkTexture);
    bindTextureToLocation(gl, removeSinksLocations.depthTexture, 3, depthTexture);
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
    gl.uniform1f(setAlphaLocations.unit, simulation.unit);

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
    // gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 0, 0, ...simulation.textureDimensions, 0);
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, ...simulation.textureDimensions);
    gl.bindTexture(gl.TEXTURE_2D, solveHeightTextures[1]);
    // gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 0, 0, ...simulation.textureDimensions, 0);
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, ...simulation.textureDimensions);

    bindTextureToLocation(gl, solveHeightLocations.alphaTexture, 0, alphaTexture);
    bindTextureToLocation(gl, solveHeightLocations.betaTexture, 1, betaTexture);
    bindTextureToLocation(gl, solveHeightLocations.depthSumTexture, 3, depthSumTexture);
    let gamma = simulation.grav * (deltaTime**2) / (4 * simulation.unit**2);
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
    // gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RED, 0, 0, ...simulation.textureDimensions, 0);
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, ...simulation.textureDimensions);

    gl.bindFramebuffer(gl.FRAMEBUFFER, heightFramebuffers[heightStep % 2]);
    gl.bindTexture(gl.TEXTURE_2D, heightn1Textures[(heightStep + 1) % 2]);
    // gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RED, 0, 0, ...simulation.textureDimensions, 0);
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, ...simulation.textureDimensions);

    heightStep++;
  }
  
  function correctVolume() {
    gl.useProgram(calcExcessVolumeProgram);
    setVertexShaderVariables(calcExcessVolumeLocations, true);
    bindTextureToLocation(gl, calcExcessVolumeLocations.heightTexture, 0, heightTextures[heightStep % 2]);
    bindTextureToLocation(gl, calcExcessVolumeLocations.heightn1Texture, 1, heightn1Textures[heightStep % 2]);
    setFramebuffer(gl, excessVolumeFramebuffers[0], ...simulation.textureDimensions);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // drawTexture();

    gl.useProgram(setConnectedVolumesProgram);
    setVertexShaderVariables(setConnectedVolumesLocations, true);
    bindTextureToLocation(gl, setConnectedVolumesLocations.heightTexture, 0, heightTextures[heightStep % 2]);
    bindTextureToLocation(gl, setConnectedVolumesLocations.groundHeightTexture, 1, groundHeightTexture);
    setFramebuffer(gl, connectedVolumesFramebuffer, ...simulation.textureDimensions);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    
    gl.useProgram(propagateExcessVolumeProgram);
    setVertexShaderVariables(propagateExcessVolumeLocations, true);
    bindTextureToLocation(gl, propagateExcessVolumeLocations.connectedVolumesTexture, 0, connectedVolumesTexture);
    gl.uniform1f(propagateExcessVolumeLocations.weightOffset, simulation.weightOffset);
    for (let i = 0; i < simulation.excessVolumePropagationRadius; i++) {
      bindTextureToLocation(gl, propagateExcessVolumeLocations.excessTexture, 1, excessVolumeTextures[i % 2]);
      setFramebuffer(gl, excessVolumeFramebuffers[(i + 1) % 2], ...simulation.textureDimensions);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    
    if (!simulation.correctVolume) return;

    gl.useProgram(correctVolumeProgram);
    setVertexShaderVariables(correctVolumeLocations, true);
    bindTextureToLocation(gl, correctVolumeLocations.heightTexture, 0, heightTextures[heightStep % 2]);
    bindTextureToLocation(gl, correctVolumeLocations.excessTexture, 1, excessVolumeTextures[simulation.excessVolumePropagationRadius % 2]);
    setFramebuffer(gl, heightFramebuffers[(heightStep + 1) % 2], ...simulation.textureDimensions);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.bindFramebuffer(gl.FRAMEBUFFER, heightn1Framebuffers[heightStep % 2]);
    gl.bindTexture(gl.TEXTURE_2D, heightn1Textures[(heightStep + 1) % 2]);
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, ...simulation.textureDimensions);
    // bindTextureToLocation(gl, correctVolumeLocations.heightTexture, 0, heightn1Textures[heightStep % 2]);
    // setFramebuffer(gl, heightn1Framebuffers[(heightStep + 1) % 2], ...simulation.textureDimensions);
    // gl.drawArrays(gl.TRIANGLES, 0, 6);

    heightStep++;
  }

  function updateHeight(deltaTime) {
    // console.log("updateHeight() deltaTime =", deltaTime);
    if (simulation.input) addSources(deltaTime);
    if (simulation.output) removeSinks(deltaTime);
    setDepth();
    setAlpha(deltaTime);
    setBeta();
    setDepthSum();
    solveHeight(deltaTime);
    incHeight();
    correctVolume();
    setDepth();
  }
  
  function render() {
    setDepth();
    gl.useProgram(renderProgram);

    setVertexShaderVariables(renderLocations, false);
    // bindTextureToLocation(gl, renderLocations.heightTexture, 0, heightTextures[heightStep % 2]);
    bindTextureToLocation(gl, renderLocations.depthTexture, 0, depthTexture);
    bindTextureToLocation(gl, renderLocations.groundHeightTexture, 1, groundHeightTexture);
    bindTextureToLocation(gl, renderLocations.normalMapTexture, 2, normalMapTexture);
    gl.uniform1f(renderLocations.scale, simulation.heightScale * 2);

    setFramebuffer(gl, null, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function setNormalMap() {
    gl.useProgram(setNormalMapProgram);

    setVertexShaderVariables(setNormalMapLocations, true);
    bindTextureToLocation(gl, setNormalMapLocations.groundHeightTexture, 0, groundHeightTexture);
    gl.uniform1f(setNormalMapLocations.unit, simulation.unit);

    setFramebuffer(gl, normalMapFramebuffer, ...simulation.textureDimensions);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function updateVelocity(deltaTime) {
    gl.useProgram(updateVelocityProgram);

    setVertexShaderVariables(updateVelocityLocations, true);
    bindTextureToLocation(gl, updateVelocityLocations.heightTexture, 0, heightTextures[heightStep % 2]);
    bindTextureToLocation(gl, updateVelocityLocations.velocityTexture, 1, velocityTextures[velocityStep % 2]);
    gl.uniform1f(updateVelocityLocations.grav, simulation.grav);
    gl.uniform1f(updateVelocityLocations.unit, simulation.unit);
    gl.uniform1f(updateVelocityLocations.deltaTime, deltaTime);

    setFramebuffer(gl, velocityFramebuffers[(velocityStep + 1) % 2], ...simulation.textureDimensions);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    velocityStep++;
  }

  function step(deltaTime) {
    console.log("step() tick =", deltaTime.toPrecision(3), "dt =", (deltaTime * simulation.timeWarp).toPrecision(3));
    updateHeight(deltaTime * simulation.timeWarp);
    updateVelocity(deltaTime * simulation.timeWarp);
    if (simulation.render) {
      render();
    } else {
      drawTexture();
    }
  }

  let then = 0
  function loop(time) {
    if (!play) { 
      console.log("-+- STOPPED LOOP -+-\n\n")
      return;
    }
    let deltaTime = time - then;
    then = time;

    step(deltaTime * 0.001);
    
    requestAnimationFrame(loop);
  }

  let play = false;
  function playPause() {
    play = !play;
    if (play) {
      console.log("\n-+- STARTED LOOP -+-")
      let time = performance.now();
      then = time;
      loop(time);
    }
  }

  function keyPress(event) {
    switch(event.key) {
      case " ":
        playPause();
        break;
      case "Enter":
        step(1 / 60);
        break;
      case "c":
        console.log("correctVolume()");
        correctVolume();
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