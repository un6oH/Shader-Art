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

  // volume correction programs
  console.log("creating calc edges program");
  const calcEdgesProgram = createProgram(gl, CALC_EDGES_VS, BLANK_FS, ["newX0", "newX1", "depth"]);
  const calcEdgesLocations = createLocations(gl, calcEdgesProgram, 
    ["prevX1", "y"], 
    ["depthTexture", "textureDimensions"]);

  console.log("creating calc excess program");
  const calcExcessProgram = createProgram(gl, CALC_EXCESS_VS, BLANK_FS, ["excess"]);
  const calcExcessLocations = createLocations(gl, calcExcessProgram, 
    ["x0", "x1", "y", "depth"], 
    ["textureDimensions", "heightTexture", "heightn1Texture", "depthTexture"]);

  console.log("creating compile coords program");
  const compileCoordsProgram = createProgram(gl, COMPILE_COORDS_VS, BLANK_FS, ["v_x0", "v_y0", "v_x1", "v_y1"], gl.INTERLEAVED_ATTRIBS);
  const compileCoordsLocations = createLocations(gl, compileCoordsProgram, ["x0", "x1", "y"], []);

  console.log("creating duplicate excess buffer program");
  const duplicateExcessBufferProgram = createProgram(gl, DUPLICATE_EXCESS_BUFFER_VS, BLANK_FS, ["v_excess", "v_copy"], gl.INTERLEAVED_ATTRIBS);
  const duplicateExcessBufferLocations = createLocations(gl, duplicateExcessBufferProgram, ["excess"], []);

  console.log("creating set excess program");
  const setExcessProgram = createProgram(gl, SET_EXCESS_VS, SET_EXCESS_FS);
  const setExcessLocations = createLocations(gl, setExcessProgram, ["position", "excess"], ["textureDimensions", "rotated", "excessTexture"]);

  console.log("creating propagate excess volume program");
  const propagateExcessProgram = createProgram(gl, TEXTURE_VS, PROPAGATE_EXCESS_VOLUME_FS);
  const propagateExcessLocations = createLocations(gl, propagateExcessProgram, ["position"], ["textureDimensions", "excessTexture"]);

  console.log("creating correct volume program");
  const correctVolumeProgram = createProgram(gl, TEXTURE_VS, CORRECT_VOLUME_FS);
  const correctVolumeLocations = createLocations(gl, correctVolumeProgram, ["position"], ["textureDimensions", "heightTexture", "excessTexture"]);

  console.log("creating rotate texture program");
  const rotateTextureProgram = createProgram(gl, ROTATE_TEXTURE_VS, ROTATE_TEXTURE_FS);
  const rotateTextureLocations = createLocations(gl, rotateTextureProgram, ["position"], ["matrix", "image"]);

  console.log("creating set boundaries program");
  const setBoundariesProgram = createProgram(gl, TEXTURE_VS, SET_BOUNDARIES_FS);
  const setBoundariesLocations = createLocations(gl, setBoundariesProgram, ["position"], ["textureDimensions", "heightTexture", "groundHeightTexture", "epsilon"]);

  // initialise buffers
  const canvasCoordsBuffer = gl.createBuffer();
  const pixelCoordsBuffer = gl.createBuffer();
  const clipSpaceCoordsBuffer = gl.createBuffer();

  const yBuffer = gl.createBuffer();
  const x0Buffer = gl.createBuffer();
  const x1Buffers = [gl.createBuffer(), gl.createBuffer()];
  const excessBuffer = gl.createBuffer();
  const depthBuffer = gl.createBuffer();
  const edgesBuffer = gl.createBuffer();
  const duplicateExcessBuffer = gl.createBuffer();

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
  const rotatedHeightTexture = createTexture(gl, [gl.NEAREST, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]);
  const rotatedHeightn1Texture = createTexture(gl, [gl.NEAREST, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]);
  const rotatedDepthTexture = createTexture(gl, [gl.NEAREST, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]);

  const normalMapTexture = createTexture(gl, [gl.LINEAR, gl.LINEAR, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]);
  const excessTextures = [createTexture(gl, [gl.NEAREST, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]), createTexture(gl, [gl.NEAREST, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE])];

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
  const normalMapFramebuffer = gl.createFramebuffer();
  const rotatedHeightFramebuffer = gl.createFramebuffer();
  const rotatedHeightn1Framebuffer = gl.createFramebuffer();
  const rotatedDepthFramebuffer = gl.createFramebuffer();
  const excessFramebuffers = [gl.createFramebuffer(), gl.createFramebuffer()];

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
    "weightOffset", 
    "groundMargin", 
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
    [0.001, 0.0001, 0],
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

  // GUI
  // buttons
  const resetButton = document.querySelector("#reset-button");
  resetButton.addEventListener("click", setSimulation);
  const toggles = [
    ["input", "Input", true], 
    ["output", "Output", true], 
    ["correctVolume", "Correct volume", true], 
  ]
  const toggleContainer = document.querySelector("#toggle-container");
  toggles.forEach(([parameter, name, value]) => {
    simulation[parameter] = value;
    
    let button = document.createElement("button");
    button.id = parameter;
    button.textContent = name + ": " + (value ? "on" : "off");
    button.addEventListener("click", () => {
      simulation[parameter] = !simulation[parameter];
      button.textContent = name + ": " + (simulation[parameter] ? "on" : "off");
    })
    toggleContainer.appendChild(button);
  });

  // output selector
  const textureSelect = document.querySelector("#texture-select");
  const textures = [ // value, name, scale, normalise
    ["height", "Height"],  
    ["depth", "Depth"], 
    ["velocity", "Velocity"],  
    ["alpha", "Alpha"],  
    ["beta", "Beta"], 
    ["depthsum", "Depth sum"],  
    ["ground", "Ground"],  
    ["sources", "Sources"],  
    ["sinks", "Sinks"],  
    ["normal", "Normal map"],  
    ["heightn1", "Previous height"],
    ["rotateddepth", "Rotated depth"],
    ["excess", "Excess"], 
  ];
  const textureDict = {};
  textures.forEach(([value, name], index) => {
    let option = document.createElement("option");
    option.value = value;
    option.textContent = name;
    textureSelect.appendChild(option);

    textureDict[value] = index;
  });
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
  });

  function setSimulation() {
    simulation.textureDimensions = [sourceImages[0].naturalWidth, sourceImages[0].naturalHeight];
    simulation.maxLength = Math.max(...simulation.textureDimensions);
    console.log("texture dimensions:", ...simulation.textureDimensions, "buffer length:", simulation.maxLength);

    parameterInputs.forEach((input, i) => {
      simulation[parameterNames[i]] = input.value;
      console.log(parameterNames[i], "set to", input.value);
    });

    simulation.solveIterations = 10;
    simulation.excessPropagationSteps = 20;

    simulation.outputTexture = textureDict[textureSelect.value];
    simulation.render = textureSelect.value == "render";
    // simulation.outputTexture = 1;
    // simulation.render = false;
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
    setupBuffer(gl, clipSpaceCoordsBuffer, new Float32Array([
      -1, 1, 1, 1, 1, -1, 
      -1, 1, 1, -1, -1, -1, 
    ]), gl.STATIC_DRAW);

    simulation.initialX1 = new Float32Array(new Array(simulation.maxLength).fill(-1));
    setupBuffer(gl, yBuffer, new Float32Array(new Array(simulation.maxLength).fill(0).map((n, i) => i)), gl.STATIC_DRAW);
    setupBuffer(gl, x0Buffer, simulation.maxLength * 4, gl.DYNAMIC_DRAW);
    setupBuffer(gl, x1Buffers[0], simulation.initialX1, gl.DYNAMIC_DRAW);
    setupBuffer(gl, x1Buffers[1], simulation.maxLength * 4, gl.DYNAMIC_DRAW);
    setupBuffer(gl, excessBuffer, simulation.maxLength * 4, gl.DYNAMIC_DRAW);
    setupBuffer(gl, depthBuffer, simulation.maxLength * 4, gl.DYNAMIC_DRAW);
    setupBuffer(gl, duplicateExcessBuffer, simulation.maxLength * 2 * 4, gl.DYNAMIC_DRAW);
    setupBuffer(gl, edgesBuffer, simulation.maxLength * 2 * 2 * 4, gl.DYNAMIC_DRAW);

    // set storage for 1D fields
    [groundHeightTexture, depthTexture, alphaTexture, betaTexture].forEach((texture) => {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, simulation.textureDimensions[0], simulation.textureDimensions[1], 0, gl.RED, gl.FLOAT, null);
    });
    // storage for depthSumTexture
    gl.bindTexture(gl.TEXTURE_2D, depthSumTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, simulation.textureDimensions[0], simulation.textureDimensions[1], 0, gl.RG, gl.FLOAT, null);

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

    // rotated textures
    gl.bindTexture(gl.TEXTURE_2D, rotatedHeightTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, simulation.textureDimensions[1], simulation.textureDimensions[0], 0, gl.RED, gl.FLOAT, null);
    gl.bindTexture(gl.TEXTURE_2D, rotatedHeightn1Texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, simulation.textureDimensions[1], simulation.textureDimensions[0], 0, gl.RED, gl.FLOAT, null);
    gl.bindTexture(gl.TEXTURE_2D, rotatedDepthTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, simulation.textureDimensions[1], simulation.textureDimensions[0], 0, gl.RED, gl.FLOAT, null);

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

      gl.bindTexture(gl.TEXTURE_2D, excessTextures[i]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, simulation.textureDimensions[0], simulation.textureDimensions[1], 0, gl.RED, gl.FLOAT, null);
      setupFramebuffer(gl, excessFramebuffers[i], excessTextures[i]);
    }

    // other framebuffers
    setupFramebuffer(gl, groundHeightFramebuffer, groundHeightTexture);
    setupFramebuffer(gl, depthFramebuffer, depthTexture);
    setupFramebuffer(gl, alphaFramebuffer, alphaTexture);
    setupFramebuffer(gl, betaFramebuffer, betaTexture);
    setupFramebuffer(gl, depthSumFramebuffer, depthSumTexture);
    setupFramebuffer(gl, normalMapFramebuffer, normalMapTexture);
    setupFramebuffer(gl, rotatedHeightFramebuffer, rotatedHeightTexture);
    setupFramebuffer(gl, rotatedHeightn1Framebuffer, rotatedHeightn1Texture);
    setupFramebuffer(gl, rotatedDepthFramebuffer, rotatedDepthTexture);

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
      heightn1Textures[heightStep % 2], 
      rotatedHeightTexture,
      excessTextures[(simulation.excessPropagationSteps + 1) % 2], 
    ][simulation.outputTexture];
    let props = [ // scale, zero-centred
      [simulation.heightScale, false], 
      [simulation.heightScale, false], 
      // [1, false], 
      [1000, false], 
      [1, false], 
      [simulation.heightScale, false], 
      [simulation.heightScale, false], 
      [simulation.heightScale, false], 
      [1, false], 
      [1, false], 
      [1, true], 
      [simulation.heightScale, false], 
      [simulation.heightScale, false], 
      [0.05, true], 
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

  function setDepth(heightTexture) {
    // console.log("setDepth()");
    gl.useProgram(setDepthProgram);

    setVertexShaderVariables(setDepthLocations, true);
    bindTextureToLocation(gl, setDepthLocations.heightTexture, 0, heightTexture);
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
    gl.bindFramebuffer(gl.FRAMEBUFFER, heightFramebuffers[heightStep % 2]);
    gl.bindTexture(gl.TEXTURE_2D, solveHeightTextures[0]);
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, ...simulation.textureDimensions);
    gl.bindTexture(gl.TEXTURE_2D, solveHeightTextures[1]);
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, ...simulation.textureDimensions);
    
    let gamma = simulation.grav * (deltaTime**2) / (4 * simulation.unit**2);

    for (let i = 0; i < simulation.solveIterations; ++i) {
      setDepth(solveHeightTextures[i % 2]);
      setAlpha(deltaTime);
      setDepthSum();

      gl.useProgram(solveHeightProgram);
      setVertexShaderVariables(solveHeightLocations, true);
      bindTextureToLocation(gl, solveHeightLocations.alphaTexture, 0, alphaTexture);
      bindTextureToLocation(gl, solveHeightLocations.betaTexture, 1, betaTexture);
      bindTextureToLocation(gl, solveHeightLocations.heightTexture, 2, solveHeightTextures[i % 2]);
      bindTextureToLocation(gl, solveHeightLocations.depthSumTexture, 3, depthSumTexture);
      gl.uniform1f(solveHeightLocations.gamma, gamma);

      setFramebuffer(gl, solveHeightFramebuffers[(i + 1) % 2], ...simulation.textureDimensions);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  }

  function incHeight() {
    // console.log("incHeight()");
    gl.bindFramebuffer(gl.FRAMEBUFFER, solveHeightFramebuffers[simulation.solveIterations % 2]);
    gl.bindTexture(gl.TEXTURE_2D, heightTextures[(heightStep + 1) % 2]);
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, ...simulation.textureDimensions);

    gl.bindFramebuffer(gl.FRAMEBUFFER, heightFramebuffers[heightStep % 2]);
    gl.bindTexture(gl.TEXTURE_2D, heightn1Textures[(heightStep + 1) % 2]);
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, ...simulation.textureDimensions);

    heightStep++;
  }

  function correctVolumeComplete(horizontal) {
    let x0 = new Float32Array(simulation.maxLength);
    gl.bindBuffer(gl.ARRAY_BUFFER, x0Buffer);
    gl.getBufferSubData(gl.ARRAY_BUFFER, 0, x0);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    for (let i = 0; i < simulation.textureDimensions[horizontal ? 1 : 0]; i++) {
      if (x0[i] != simulation.textureDimensions[horizontal ? 0 : 1]) {
        return false;
      }
    }
    return true;
  }
  
  const calcEdgesTransformFeedbackA = makeTransformFeedback(gl, [x0Buffer, x1Buffers[1], depthBuffer]);
  const calcEdgesTransformFeedbackB = makeTransformFeedback(gl, [x0Buffer, x1Buffers[0], depthBuffer]);
  const calcEdgesTransformFeedbacks = [calcEdgesTransformFeedbackA, calcEdgesTransformFeedbackB];
  const calcExcessTransformFeedback = makeTransformFeedback(gl, [excessBuffer]);
  const compileCoordsTransformFeedback = makeTransformFeedback(gl, [edgesBuffer]);
  const duplicateExcessBufferTransformFeedback = makeTransformFeedback(gl, [duplicateExcessBuffer]);

  function setExcess(heightTexture, heightn1Texture, depthTexture, rotated = false) {
    // let x0 = new Float32Array(simulation.maxLength);
    // let x1 = new Float32Array(simulation.maxLength);
    // let excess = new Float32Array(simulation.maxLength);

    let width = simulation.textureDimensions[rotated ? 1 : 0];
    let height = simulation.textureDimensions[rotated ? 0 : 1];

    setupBuffer(gl, x1Buffers[0], simulation.initialX1, gl.DYNAMIC_DRAW);
    for (let s = 0; s < width; s++) {
      gl.enable(gl.RASTERIZER_DISCARD);
      setFramebuffer(gl, null, 0, 0);

      // calc edges
      gl.useProgram(calcEdgesProgram);
      bindBuffer(gl, x1Buffers[s % 2], calcEdgesLocations.prevX1, 1, gl.FLOAT, false, 0, 0);
      bindBuffer(gl, yBuffer, calcEdgesLocations.y, 1, gl.FLOAT, false, 0, 0);
      bindTextureToLocation(gl, calcEdgesLocations.depthTexture, 0, depthTexture);
      gl.uniform2f(calcEdgesLocations.textureDimensions, width, height);
      drawWithTransformFeedback(gl, calcEdgesTransformFeedbacks[s % 2], gl.POINTS, () => { gl.drawArrays(gl.POINTS, 0, height); });

      // check if complete
      if (correctVolumeComplete(!rotated)) {
        // console.log(`${rotated ? "vertical" : "horizontal"} excess calculation complete (${s} steps)`);
        gl.disable(gl.RASTERIZER_DISCARD);
        break;
      }

      // calc excess
      gl.useProgram(calcExcessProgram);
      bindBuffer(gl, x0Buffer, calcExcessLocations.x0, 1, gl.FLOAT, false, 0, 0);
      bindBuffer(gl, x1Buffers[(s + 1) % 2], calcExcessLocations.x1, 1, gl.FLOAT, false, 0, 0);
      bindBuffer(gl, depthBuffer, calcExcessLocations.depth, 1, gl.FLOAT, false, 0, 0);
      bindBuffer(gl, yBuffer, calcExcessLocations.y, 1, gl.FLOAT, false, 0, 0);
      gl.uniform2f(calcExcessLocations.textureDimensions, width, height);
      bindTextureToLocation(gl, calcExcessLocations.heightTexture, 0, heightTexture);
      bindTextureToLocation(gl, calcExcessLocations.heightn1Texture, 1, heightn1Texture);
      bindTextureToLocation(gl, calcExcessLocations.depthTexture, 2, depthTexture);
      setFramebuffer(gl, null, 0, 0);
      drawWithTransformFeedback(gl, calcExcessTransformFeedback, gl.POINTS, () => { gl.drawArrays(gl.POINTS, 0, height); });

      // gl.bindBuffer(gl.ARRAY_BUFFER, x0Buffer);
      // gl.getBufferSubData(gl.ARRAY_BUFFER, 0, x0);
      // gl.bindBuffer(gl.ARRAY_BUFFER, x1Buffers[(s + 1) % 2]);
      // gl.getBufferSubData(gl.ARRAY_BUFFER, 0, x1);
      // gl.bindBuffer(gl.ARRAY_BUFFER, excessBuffer);
      // gl.getBufferSubData(gl.ARRAY_BUFFER, 0, excess);
      // if (rotated) {
      //   console.log("y0:", ...x0, "\ny1:", ...x1, "\nexcess:", ...excess);
      // } else {
      //   console.log("x0:", ...x0, "\nx1:", ...x1, "\nexcess:", ...excess);
      // }

      // compile coords
      gl.useProgram(compileCoordsProgram);
      bindBuffer(gl, x0Buffer, compileCoordsLocations.x0, 1, gl.FLOAT);
      bindBuffer(gl, x1Buffers[(s + 1) % 2], compileCoordsLocations.x1, 1, gl.FLOAT);
      bindBuffer(gl, yBuffer, compileCoordsLocations.y, 1, gl.FLOAT);
      drawWithTransformFeedback(gl, compileCoordsTransformFeedback, gl.POINTS, () => { gl.drawArrays(gl.POINTS, 0, height); });

      // duplicate coordinates
      gl.useProgram(duplicateExcessBufferProgram);
      bindBuffer(gl, excessBuffer, duplicateExcessBufferLocations.excess, 1, gl.FLOAT);
      drawWithTransformFeedback(gl, duplicateExcessBufferTransformFeedback, gl.POINTS, () => { gl.drawArrays(gl.POINTS, 0, height); });

      // correct volume
      gl.disable(gl.RASTERIZER_DISCARD);

      gl.useProgram(setExcessProgram);
      bindBuffer(gl, edgesBuffer, setExcessLocations.position, 2, gl.FLOAT);
      bindBuffer(gl, duplicateExcessBuffer, setExcessLocations.excess, 1, gl.FLOAT);
      gl.uniform2fv(setExcessLocations.textureDimensions, simulation.textureDimensions);
      gl.uniform1i(setExcessLocations.rotated, rotated ? 1 : 0);
      bindTextureToLocation(gl, setExcessLocations.excessTexture, 0, excessTextures[rotated ? 1 : 0]);
      setFramebuffer(gl, excessFramebuffers[rotated ? 0 : 1], ...simulation.textureDimensions);
      gl.drawArrays(gl.LINES, 0, height * 2);
    }
  }

  function propagateExcess() {
    gl.useProgram(propagateExcessProgram);
    setVertexShaderVariables(propagateExcessLocations, true);

    for (let i = 0; i < simulation.excessPropagationSteps; i++) {
      bindTextureToLocation(gl, propagateExcessLocations.excessTexture, 0, excessTextures[i % 2])
      setFramebuffer(gl, excessFramebuffers[(i + 1) % 2], ...simulation.textureDimensions);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  }

  function correctVolume() {
    setDepth(heightTextures[heightStep % 2]);

    setFramebuffer(gl, excessFramebuffers[0], ...simulation.textureDimensions);
    gl.clearBufferfv(gl.COLOR, 0, new Float32Array([0, 0, 0, 0]));

    // horizontal
    setExcess(heightTextures[heightStep % 2], heightn1Textures[heightStep % 2], depthTexture);

    // create rotated height textures
    gl.useProgram(rotateTextureProgram);
    bindBuffer(gl, clipSpaceCoordsBuffer, rotateTextureLocations.position, 2, gl.FLOAT);
    gl.uniformMatrix3fv(rotateTextureLocations.matrix, true, [
      0, -1, 0, 
      1, 0, 0, 
      0, 0, 1
    ]);
    bindTextureToLocation(gl, rotateTextureLocations.image, 0, heightTextures[heightStep % 2]);
    setFramebuffer(gl, rotatedHeightFramebuffer, simulation.textureDimensions[1], simulation.textureDimensions[0]);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    bindTextureToLocation(gl, rotateTextureLocations.image, 0, heightn1Textures[heightStep % 2]);
    setFramebuffer(gl, rotatedHeightn1Framebuffer, simulation.textureDimensions[1], simulation.textureDimensions[0]);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    bindTextureToLocation(gl, rotateTextureLocations.image, 0, depthTexture);
    setFramebuffer(gl, rotatedDepthFramebuffer, simulation.textureDimensions[1], simulation.textureDimensions[0]);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    
    // vertical
    setExcess(rotatedHeightTexture, rotatedHeightn1Texture, rotatedDepthTexture, true);
  
    propagateExcess();

    gl.useProgram(correctVolumeProgram);
    setVertexShaderVariables(correctVolumeLocations, true);
    bindTextureToLocation(gl, correctVolumeLocations.heightTexture, 0, heightTextures[heightStep % 2]);
    bindTextureToLocation(gl, correctVolumeLocations.excessTexture, 1, excessTextures[(simulation.excessPropagationSteps + 1) % 2]);
    setFramebuffer(gl, heightFramebuffers[(heightStep + 1) % 2], ...simulation.textureDimensions);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.bindFramebuffer(gl.FRAMEBUFFER, heightn1Framebuffers[heightStep % 2]);
    gl.bindTexture(gl.TEXTURE_2D, heightn1Textures[(heightStep + 1) % 2]);
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, ...simulation.textureDimensions);

    heightStep++;
  }

  function setBoundaries() {
    gl.useProgram(setBoundariesProgram);
    setVertexShaderVariables(setBoundariesLocations, true);
    bindTextureToLocation(gl, setBoundariesLocations.heightTexture, 0, heightTextures[heightStep % 2]);
    bindTextureToLocation(gl, setBoundariesLocations.groundHeightTexture, 1, groundHeightTexture);
    gl.uniform1f(setBoundariesLocations.epsilon, simulation.groundMargin);
    setFramebuffer(gl, heightFramebuffers[(heightStep + 1) % 2], ...simulation.textureDimensions);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    bindTextureToLocation(gl, setBoundariesLocations.heightTexture, 0, heightn1Textures[heightStep % 2]);
    setFramebuffer(gl, heightn1Framebuffers[(heightStep + 1) % 2], ...simulation.textureDimensions);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    heightStep++;
  }

  function updateHeight(deltaTime) {
    // console.log("updateHeight() deltaTime =", deltaTime);
    if (simulation.input) addSources(deltaTime);
    if (simulation.output) removeSinks(deltaTime);
    setBeta();
    solveHeight(deltaTime);
    incHeight();
    if (simulation.correctVolume) correctVolume();
    setBoundaries();
  }
  
  function render() {
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
      case "e":
        
        break;
      default:

    }
  }

  document.addEventListener("keypress", keyPress);

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