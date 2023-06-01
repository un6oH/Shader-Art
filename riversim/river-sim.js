function main(groundHeightSource, sources, sinks) {
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
  const drawTextureProgram = createProgram(gl, CANVAS_VS, DRAW_TEXTURE_FS);
  const drawTextureLocations = createLocations(gl, drawTextureProgram, ["position"], 
  ["canvasDimensions", "texture"]);
  
  const setGroundHeightProgram = createProgram(gl, TEXTURE_VS, SET_GROUND_HEIGHT_FS);
  const setGroundHeightLocations = createLocations(gl, setGroundHeightProgram, ["position"], 
  ["textureDimensions", "groundHeightTexture", "scale"]);

  const addSourcesProgram = createProgram(gl, TEXTURE_VS, ADD_SOURCES_FS);
  const addSourcesLocations = createProgram(gl, addSourcesProgram, ["position"], 
  ["textureDimensions", "heightTexture", "sourceTexture", "sinkTexture", "sourceHeight", "sinkHeight", "inputRate", "outputRate", "deltaTime"])

  const setDepthFieldProgram = createProgram(gl, TEXTURE_VS, SET_DEPTH_FIELD_FS);
  const setDepthFieldLocations = createLocations(gl, setDepthFieldProgram, ["position"], 
  ["textureDimensions", "heightTexture", "groundHeightTexture"]);

  const setAlphaProgram = createProgram(gl, TEXTURE_VS, SET_ALPHA_FS);
  const setAlphaLocations = createLocations(gl, setAlphaProgram, ["position"], 
  ["textureDimensions", "depthTexture", "grav", "deltaTime", "distance"]);

  const setBetaProgram = createProgram(gl, TEXTURE_VS, SET_BETA_FS);
  const setBetaLocations = createLocations(gl, setBetaProgram, ["position"], 
  ["textureDimensions", "heightTexturen1", "heightTexturen2", "damping"]);
  
  const setDepthSumProgram = createProgram(gl, TEXTURE_VS, SET_DEPTH_SUM_FS);
  const setDepthSumLocations = createLocations(gl, setDepthSumProgram, ["position"], 
  ["textureDimensions", "depthTexture"]);

  const solveHeightProgram = createProgram(gl, TEXTURE_VS, SOLVE_HEIGHT_FS);
  const solveHeightLocations = createLocations(gl, solveHeightProgram, ["position"], 
  ["textureDimensions", "alphaTexture", "betaTexture", "heightTexture", "depthSumTexture", "gamma"]);

  const setHeightProgram = createProgram(gl, TEXTURE_VS, SET_HEIGHT_FS);
  const setHeightLocations = createLocations(gl, setHeightProgram, ["position"], 
  ["textureDimensions", "heightTexture"]);

  const updateVelocityProgram = createProgram(gl, TEXTURE_VS, UPDATE_VELOCITY_FS);
  const updateVelocityLocations = createLocations(gl, updateVelocityProgram, ["position"], 
  ["textureDimensions", "heightTexture", "velocityTexture", "grav", "distance"]);

  // initialise buffers
  const canvasCoordsBuffer = gl.createBuffer();
  const pixelCoordsBuffer = gl.createBuffer();

  // textures
  const heightATexture = createTexture(gl);
  const heightBTexture = createTexture(gl);
  const heightn1Texture = createTexture(gl);
  const heightn2Texture = createTexture(gl);
  const groundHeightTexture = createTexture(gl);
  const groundHeightSourceTexture = createTexture(gl);
  const sourceTexture = createTexture(gl);
  const sinkTexture = createTexture(gl);

  const depthTexture = createTexture(gl);
  const alphaTexture = createTexture(gl);
  const betaTexture = createTexture(gl);
  const depthSumTexture = createTexture(gl);
  const velocityTexture = createTexture(gl);

  // framebuffers
  const heightAFramebuffer = createFramebuffer(gl, heightATexture);
  const heightBFramebuffer = createFramebuffer(gl, heightBTexture);
  const heightn1Framebuffer = createFramebuffer(gl, heightn1Texture);
  const heightn2Framebuffer = createFramebuffer(gl, heightn2Texture);
  const groundHeightFramebuffer = createFramebuffer(gl, groundHeightTexture);
  const depthFramebuffer = createFramebuffer(gl, depthTexture);
  const alphaFramebuffer = createFramebuffer(gl, alphaTexture);
  const betaFramebuffer = createFramebuffer(gl, betaTexture);
  const depthSumFramebuffer = createFramebuffer(gl, depthSumTexture);
  const velocityFramebuffer = createFramebuffer(gl, velocityTexture);

  const simulation = {};
  function setSimulation() {
    // constants
    simulation.textureSize = [256, 256];
    simulation.grav = 1;
    simulation.distance = 1;
    simulation.damping = 0;

    simulation.heightScale = 10;
    simulation.sourceHeight = 10;
    simulation.sinkHeight = 0;
    simulation.inputRate = 1;
    simulation.outputRate = 1;

    // buffers
    setupBuffer(gl, canvasCoordsBuffer, new Float32Array([
      0, 0, canvas.width, 0, canvas.width, canvas.height, 
      0, 0, canvas.width, canvas.height, 0, canvas.height, 
    ]));

    // create vertex arrays


    // set storage for 1D fields
    [heightATexture, heightBTexture, heightTexturen1Texture, heightTexturen2Texture, depthTexture, alphaTexture, betaTexture].forEach((texture) => {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, simulation.textureSize[0], simulation.textureSize[1], 0, gl.RED, gl.FLOAT, null);
    });
    // storage for 2D fields
    [depthSumTexture, velocityTexture].forEach((texture) => {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, simulation.textureSize[0], simulation.textureSize[1], 0, gl.RG, gl.FLOAT, null);
    });

    // set storage for image input textures
    gl.bindTexture(gl.TEXTURE_2D, groundHeightSourceTexture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, groundHeightSource);

    gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sources);

    gl.bindTexture(gl.TEXTURE_2D, sinkTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sinks);


  }


}

function setup() {
  let groundHeightTexture = new Image();
  groundHeightTexture.src = "groundheightTexture.png";
  let sources = new Image();
  sources.src = "sources.png";
  let sinks = new Image();
  sinks.src = "sinks.png";

  heightTexture.onload = () => main(heightTexture, sources, sinks);
}

setup();