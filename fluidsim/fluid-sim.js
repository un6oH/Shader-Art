function render(images) {
  // initialise canvas
  const canvas = document.querySelector("#gl-canvas");
  const gl = canvas.getContext("webgl");
  if (!gl) { 
    alert("Unable to initialise WebGL"); 
    return; 
  }

  const textureFloatExtension = gl.getExtension("OES_texture_float");
  const clearFloatExtension = gl.getExtension("WEBGL_color_buffer_float");
  if (!textureFloatExtension || !clearFloatExtension) {
    alert("need extensions");
    return;
  }

  //
  // global variables
  //
  // set canvas size to client canvas size
  canvas.width = gl.canvas.clientWidth;
  canvas.height = gl.canvas.clientHeight;

  // image objects
  const initial = images[0];
  const source = images[1];
  const boundaries = images[2];

  // set texture size to input image size
  const textureWidth = source.width;
  const textureHeight = source.height;
  const wrapTexture = [false, false];
  
  console.log("Simulating " + textureWidth + ", " + textureHeight + " grid, output to " + canvas.width + ", " + canvas.height + " canvas");
  
  // constants
  const VELOCITY_FIELD = false;
  const DENSITY_FIELD = true;
  const VELOCITY = false;
  const CONTINUOUS = true;
  
  //
  // simulation parameters
  //
  const diffusionRate = Math.pow(10, 0);
  const viscosity = Math.pow(10, -2);
  const deltaTime = 1 / 60;
  const splatDensity = 10;
  const splatRadius = 10;

  const RELAXATION_STEPS = 60;
  
  // create field
  const sourceTexture = createAndSetupTexture(gl);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  const boundariesTexture = createAndSetupTexture(gl);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, boundaries);

  let fieldStep = 0;
  let pFieldStep = 0;

  //
  // initialisation time
  //
  // initialise field textures
  const prevFieldTexture = createAndSetupTexture(gl);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, textureWidth, textureHeight, 0, gl.RGBA, gl.FLOAT, null);
  const prevFieldFramebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, prevFieldFramebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, prevFieldTexture, 0);

  const fieldTextures = [];
  const fieldFramebuffers = [];
  for (let i = 0; i < 2; ++i) {
    texture = createAndSetupTexture(gl);
    fieldTextures.push(texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, textureWidth, textureHeight, 0, gl.RGBA, gl.FLOAT, null);

    let framebuffer = gl.createFramebuffer();
    fieldFramebuffers.push(framebuffer);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  }
  gl.clearColor(0, 0, 0, 1);

  // create position buffers
  const texPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texPositionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    0, 0, textureWidth, 0, textureWidth, textureHeight, 
    0, 0, textureWidth, textureHeight, 0, textureHeight
  ]), gl.STATIC_DRAW);

  const canvasPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, canvasPositionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    0, 0, canvas.width, 0, canvas.width, canvas.height, 
    0, 0, canvas.width, canvas.height, 0, canvas.height
  ]), gl.STATIC_DRAW);

  // initialise add source program
  console.log("creating add source program...");
  const addSourceProgram = createProgram(gl, BUFFER_VERT, ADD_SOURCE_FRAG);
  const addSourceDataLocations = {
    position: gl.getAttribLocation(addSourceProgram, "a_position"),
    textureResolution: gl.getUniformLocation(addSourceProgram, "u_textureResolution"),
    source: gl.getUniformLocation(addSourceProgram, "u_source"),
    field: gl.getUniformLocation(addSourceProgram, "u_field"),
    inputMode: gl.getUniformLocation(addSourceProgram, "u_inputMode"), 
    mousePos: gl.getUniformLocation(addSourceProgram, "u_mousePos"), 
    mouseVel: gl.getUniformLocation(addSourceProgram, "u_mouseVel"), 
    splatDensity: gl.getUniformLocation(addSourceProgram, "u_splatDensity"), 
    splatRadius: gl.getUniformLocation(addSourceProgram, "u_splatRadius"),
    deltaTime: gl.getUniformLocation(addSourceProgram, "u_deltaTime"),
  };
  gl.useProgram(addSourceProgram);
  gl.uniform2f(addSourceDataLocations.textureResolution, textureWidth, textureHeight);
  gl.uniform1i(addSourceDataLocations.field, 0);
  gl.uniform1i(addSourceDataLocations.source, 1);
  gl.uniform1f(addSourceDataLocations.splatDensity, splatDensity);
  gl.uniform1f(addSourceDataLocations.splatRadius, splatRadius);
  gl.uniform1f(addSourceDataLocations.deltaTime, deltaTime);
  
  // initialise diffuse program
  console.log("creating diffuse program...");
  const diffuseProgram = createProgram(gl, BUFFER_VERT, DIFFUSE_FRAG);
  const diffuseDataLocations = {
    position: gl.getAttribLocation(diffuseProgram, "a_position"), 
    textureResolution: gl.getUniformLocation(diffuseProgram, "u_textureResolution"), 
    field: gl.getUniformLocation(diffuseProgram, "u_field"), 
    field0: gl.getUniformLocation(diffuseProgram, "u_field0"), 
    deltaTime: gl.getUniformLocation(diffuseProgram, "u_deltaTime"), 
    fieldType: gl.getUniformLocation(diffuseProgram, "u_fieldType"), 
    diffusionRate: gl.getUniformLocation(diffuseProgram, "u_diffusionRate"), 
  };
  gl.useProgram(diffuseProgram);
  gl.uniform2f(diffuseDataLocations.textureResolution, textureWidth, textureHeight);
  gl.uniform1i(diffuseDataLocations.field, 0);
  gl.uniform1i(diffuseDataLocations.field0, 1);
  gl.uniform1f(diffuseDataLocations.deltaTime, deltaTime);
  
  // initialise set field 0 program
  console.log("creating copy field program");
  const copyFieldProgram = createProgram(gl, BUFFER_VERT, COPY_FIELD_FRAG);
  const copyFieldDataLocations = {
    position: gl.getAttribLocation(copyFieldProgram, "a_position"), 
    textureResolution: gl.getUniformLocation(copyFieldProgram, "u_textureResolution"), 
    field: gl.getUniformLocation(copyFieldProgram, "u_field"), 
  };
  gl.useProgram(copyFieldProgram);
  gl.uniform2f(copyFieldDataLocations.textureResolution, textureWidth, textureHeight);
  gl.uniform1i(copyFieldDataLocations.field, 0);
  let field0Texture = createAndSetupTexture(gl);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, textureWidth, textureHeight, 0, gl.RGBA, gl.FLOAT, null);
  let field0Framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, field0Framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, field0Texture, 0);
  
  // initialise advect program
  console.log("creating advect program...");
  const advectProgram = createProgram(gl, BUFFER_VERT, ADVECT_FRAG);
  const advectDataLocations = {
    position: gl.getAttribLocation(advectProgram, "a_position"), 
    textureResolution: gl.getUniformLocation(advectProgram, "u_textureResolution"),
    field: gl.getUniformLocation(advectProgram, "u_field"), 
    deltaTime: gl.getUniformLocation(advectProgram, "u_deltaTime"), 
    fieldType: gl.getUniformLocation(advectProgram, "u_fieldType"), 
  };
  gl.useProgram(advectProgram);
  gl.uniform2f(advectDataLocations.textureResolution, textureWidth, textureHeight);
  gl.uniform1i(advectDataLocations.field, 0);
  gl.uniform1f(advectDataLocations.deltaTime, deltaTime);

  //
  // initialise programs for project function
  //
  // calc div field
  console.log("creating calc div field program...");
  const calcDivFieldProgram = createProgram(gl, BUFFER_VERT, CALC_DIV_FIELD_FRAG);
  const calcDivFieldDataLocations = {
    position: gl.getAttribLocation(calcDivFieldProgram, "a_position"), 
    textureResolution: gl.getUniformLocation(calcDivFieldProgram, "u_textureResolution"), 
    field: gl.getUniformLocation(calcDivFieldProgram, "u_field"), 
    h: gl.getUniformLocation(calcDivFieldProgram, "h"), 
  };
  gl.useProgram(calcDivFieldProgram);
  gl.uniform2f(calcDivFieldDataLocations.textureResolution, textureWidth, textureHeight);
  gl.uniform1i(calcDivFieldDataLocations.field, 0);
  gl.uniform1f(calcDivFieldDataLocations.h, 1 / Math.sqrt(textureWidth * textureHeight));
  const divFieldTextures = [];
  const divFieldFramebuffers = [];
  for (let i = 0; i < 2; ++i) {
    let texture = createAndSetupTexture(gl);
    divFieldTextures.push(texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, textureWidth, textureHeight, 0, gl.RGBA, gl.FLOAT, null);

    let framebuffer = gl.createFramebuffer();
    divFieldFramebuffers.push(framebuffer);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  }

  // calc gradient field
  console.log("creating calc gradient field program...");
  const calcGradientFieldProgram = createProgram(gl, BUFFER_VERT, CALC_GRADIENT_FIELD_FRAG);
  const calcGradientFieldDataLocations = {
    position: gl.getAttribLocation(calcGradientFieldProgram, "a_position"), 
    textureResolution: gl.getUniformLocation(calcGradientFieldProgram, "u_textureResolution"), 
    gradientField: gl.getUniformLocation(calcGradientFieldProgram, "u_gradientField"), 
    divField: gl.getUniformLocation(calcGradientFieldProgram, "u_divField"), 
  };
  gl.useProgram(calcGradientFieldProgram);
  gl.uniform2f(calcGradientFieldDataLocations.textureResolution, textureWidth, textureHeight);
  gl.uniform1i(calcGradientFieldDataLocations.gradientField, 0);
  gl.uniform1i(calcGradientFieldDataLocations.divField, 1);
  const pFieldTextures = [];
  const pFieldFramebuffers = [];
  for (let i = 0; i < 2; ++i) {
    let texture = createAndSetupTexture(gl);
    pFieldTextures.push(texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, textureWidth, textureHeight, 0, gl.RGBA, gl.FLOAT, null);

    let framebuffer = gl.createFramebuffer();
    pFieldFramebuffers.push(framebuffer);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  }
  
  // calc mass conserving field
  console.log("creating calc mass conserving field program...");
  const calcMassConservingFieldProgram = createProgram(gl, BUFFER_VERT, CALC_MASS_CONSERVING_FIELD_FRAG);
  const calcMassConservingFieldDataLocations = {
    position: gl.getAttribLocation(calcMassConservingFieldProgram, "a_position"), 
    textureResolution: gl.getUniformLocation(calcMassConservingFieldProgram, "u_textureResolution"), 
    field: gl.getUniformLocation(calcMassConservingFieldProgram, "u_field"), 
    gradientField: gl.getUniformLocation(calcMassConservingFieldProgram, "u_gradientField"), 
    h: gl.getUniformLocation(calcMassConservingFieldProgram, "h"), 
  };
  gl.useProgram(calcMassConservingFieldProgram);
  gl.uniform2f(calcMassConservingFieldDataLocations.textureResolution, textureWidth, textureHeight);
  gl.uniform1i(calcMassConservingFieldDataLocations.field, 0);
  gl.uniform1i(calcMassConservingFieldDataLocations.gradientField, 1);
  gl.uniform1f(calcMassConservingFieldDataLocations.h, 1.0 / Math.sqrt(textureWidth * textureHeight));


  // initialise set boundaries program
  console.log("creating set boundaries program...");
  const setBoundariesProgram = createProgram(gl, BUFFER_VERT, SET_BOUNDARIES_FRAG);
  const setBoundariesDataLocations = {
    position: gl.getAttribLocation(setBoundariesProgram, "a_position"), 
    textureResolution: gl.getUniformLocation(setBoundariesProgram, "u_textureResolution"), 
    boundaries: gl.getUniformLocation(setBoundariesProgram, "u_boundaries"), 
    field: gl.getUniformLocation(setBoundariesProgram, "u_field"), 
    boundaryType: gl.getUniformLocation(setBoundariesProgram, "u_boundaryType"), 
  };
  gl.useProgram(setBoundariesProgram);
  gl.uniform2f(setBoundariesDataLocations.textureResolution, textureWidth, textureHeight);
  gl.uniform1i(setBoundariesDataLocations.field, 0);
  gl.uniform1i(setBoundariesDataLocations.boundaries, 1);

  // initialise display program
  console.log("creating display program...");
  const displayProgram = createProgram(gl, CANVAS_VERT, DISPLAY_FRAG);
  const displayDataLocations = {
    position: gl.getAttribLocation(displayProgram, "a_position"), 
    canvasResolution: gl.getUniformLocation(displayProgram, "u_canvasResolution"), 
    textureResolution: gl.getUniformLocation(displayProgram, "u_textureResolution"), 
    field: gl.getUniformLocation(displayProgram, "u_field"), 
    boundaries: gl.getUniformLocation(displayProgram, "u_boundaries"), 
    prevField: gl.getUniformLocation(displayProgram, "u_prevField"), 
  };
  gl.useProgram(displayProgram);
  gl.uniform2f(displayDataLocations.canvasResolution, canvas.width, canvas.height);
  gl.uniform2f(displayDataLocations.textureResolution, textureWidth, textureHeight);
  gl.uniform1i(displayDataLocations.field, 0);
  gl.uniform1i(displayDataLocations.boundaries, 1);
  gl.uniform1i(displayDataLocations.prevField, 2);

  //
  // functions
  //
  function addSource(inputMode = 0, mouseX = 0, mouseY = 0, pmouseX = 0, pmouseY = 0) {
    gl.useProgram(addSourceProgram);

    setPositionAttribute(gl, addSourceDataLocations.position, texPositionBuffer);
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fieldTextures[fieldStep % 2]);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, sourceTexture);

    ++fieldStep;

    if (inputMode == 1) {
      let x = mouseX / canvas.clientWidth * textureWidth;
      let y = mouseY / canvas.clientHeight * textureHeight;
      let x0 = pmouseX / canvas.clientWidth * textureWidth;
      let y0 = pmouseY / canvas.clientHeight * textureHeight;
      gl.uniform2f(addSourceDataLocations.mousePos, x, y);
      gl.uniform2f(addSourceDataLocations.mouseVel, (x - x0) / deltaTime, (y - y0) / deltaTime);
      console.log("Mouse at " + x + ',' + y);
    }

    gl.uniform1i(addSourceDataLocations.inputMode, inputMode);

    gl.clearColor(0, 0, 0, 1);
    setFramebuffer(fieldFramebuffers[fieldStep % 2], textureWidth, textureHeight);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function diffuse(fieldType) {
    // set field0
    gl.useProgram(copyFieldProgram);
    setPositionAttribute(gl, copyFieldDataLocations.position, texPositionBuffer);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fieldTextures[fieldStep % 2]);
    setFramebuffer(field0Framebuffer, textureWidth, textureHeight);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // iterate solve
    for (let i = 0; i < RELAXATION_STEPS; ++i) {
      // console.log("diffuse iteration");

      gl.useProgram(diffuseProgram);

      setPositionAttribute(gl, diffuseDataLocations.position, texPositionBuffer);
      
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, fieldTextures[fieldStep % 2]);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, field0Texture); // bind x0 to texture unit 1
  
      ++fieldStep;
      
      setFramebuffer(fieldFramebuffers[fieldStep % 2], textureWidth, textureHeight);
      gl.uniform1i(diffuseDataLocations.fieldType, fieldType);
      gl.uniform1f(diffuseDataLocations.diffusionRate, fieldType ? viscosity : diffusionRate);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      
      setBoundaries(fieldTextures[fieldStep % 2], fieldFramebuffers[(fieldStep + 1) % 2], fieldType); ++fieldStep;
    }
  }

  function advect(fieldType) {
    gl.useProgram(advectProgram);

    setPositionAttribute(gl, advectDataLocations.position, texPositionBuffer);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fieldTextures[fieldStep % 2]);

    ++fieldStep;

    setFramebuffer(fieldFramebuffers[fieldStep % 2], textureWidth, textureHeight);
    gl.uniform1i(advectDataLocations.fieldType, fieldType);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    setBoundaries(fieldTextures[fieldStep % 2], fieldFramebuffers[(fieldStep + 1) % 2], fieldType); ++fieldStep;
  }

  function project() {
    // calculate divergence field
    gl.useProgram(calcDivFieldProgram);

    setPositionAttribute(gl, calcDivFieldDataLocations.position, texPositionBuffer);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fieldTextures[fieldStep % 2]);

    setFramebuffer(divFieldFramebuffers[0], textureWidth, textureHeight);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    setBoundaries(divFieldTextures[0], divFieldFramebuffers[1], CONTINUOUS);

    // calculate gradient field
    pFieldStep = 0;
    setFramebuffer(pFieldFramebuffers[0], textureWidth, textureHeight);

    for (let i = 0; i < RELAXATION_STEPS; ++i) {
      // iterate solver
      gl.useProgram(calcGradientFieldProgram);

      setPositionAttribute(gl, calcGradientFieldDataLocations.position, texPositionBuffer);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, pFieldTextures[pFieldStep % 2]);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, divFieldTextures[1]);

      ++pFieldStep;

      setFramebuffer(pFieldFramebuffers[pFieldStep % 2], textureWidth, textureHeight);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      setBoundaries(pFieldTextures[pFieldStep % 2], pFieldFramebuffers[(pFieldStep + 1) % 2], CONTINUOUS); ++pFieldStep;
    }

    // calculate mass conserving field
    gl.useProgram(calcMassConservingFieldProgram);

    setPositionAttribute(gl, calcMassConservingFieldDataLocations.position, texPositionBuffer);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fieldTextures[fieldStep % 2]);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, pFieldTextures[pFieldStep % 2]);

    ++fieldStep;
    
    setFramebuffer(fieldFramebuffers[fieldStep % 2], textureWidth, textureHeight);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    setBoundaries(fieldTextures[fieldStep % 2], fieldFramebuffers[(fieldStep + 1) % 2], VELOCITY); ++fieldStep;
  }

  function setBoundaries(inputTexture, outputFramebuffer, boundaryType) {
    gl.useProgram(setBoundariesProgram);

    setPositionAttribute(gl, setBoundariesDataLocations.position, texPositionBuffer);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, inputTexture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, boundariesTexture);

    setFramebuffer(outputFramebuffer, textureWidth, textureHeight);
    gl.uniform1i(setBoundariesDataLocations.boundaryType, boundaryType);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function display(texture = fieldTextures[fieldStep % 2]) {
    // draw
    gl.useProgram(displayProgram);

    setPositionAttribute(gl, displayDataLocations.position, canvasPositionBuffer);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, boundariesTexture);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, prevFieldTexture);

    setFramebuffer(null, canvas.width, canvas.height);
    
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // save texture
    gl.useProgram(copyFieldProgram);
    setPositionAttribute(gl, copyFieldDataLocations.position, texPositionBuffer);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fieldTextures[fieldStep % 2]);
    setFramebuffer(prevFieldFramebuffer, textureWidth, textureHeight);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function setFramebuffer(fbo, width, height) { 
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, width, height);
  }
  
  display();
  
  // animation
  let playAnimation = true;

  let mouseInput = false;
  let constantInput = false;

  let mouseX, mouseY, pmouseX, pmouseY;

  requestAnimationFrame(update);

  // continuous animation
  function playPause() {
    if (!playAnimation) {
      console.log("simulation started");
      playAnimation = true;
      requestAnimationFrame(update);
    } else {
      console.log("simulation paused");
      playAnimation = false;
    }
  }

  document.addEventListener('keydown', (event) => {
    const keyName = event.key;

    if (keyName == ' ') {
      playPause();
      return;
    }

    if (keyName == 'Enter') {
      constantInput = constantInput ? false : true;
      console.log(constantInput ? "constant source activated" : "constant source deactivated");
    }

  });

  document.addEventListener('mousemove', (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
  });

  document.addEventListener('mousedown', () => { mouseInput = true; });
  document.addEventListener('mouseup', () => { mouseInput = false; });

  function update() {
    if (!playAnimation) { return; }

    if (constantInput) {
      addSource(0);
    }
    if (mouseInput) {
      addSource(1, mouseX, mouseY, pmouseX, pmouseY);
      pmouseX = mouseX;
      pmouseY = mouseY;
    }

    // velocity step
    // diffuse(VELOCITY_FIELD);
    project();
    advect(VELOCITY_FIELD);
    // project();

    // density step
    diffuse(DENSITY_FIELD);
    advect(DENSITY_FIELD);

    // draw to canvas
    display();
 
    requestAnimationFrame(update);
  }

  const steps = [
    () => { 
      // add sources and forces
      addSource();
  
      // velocity step
      // diffuse(VELOCITY_FIELD);
      project();
      advect(VELOCITY_FIELD);
      // project();
  
      // density step
      diffuse(DENSITY_FIELD);
      advect(DENSITY_FIELD);
  
      // draw to canvas
      display();
    },
  ];
  function clickUpdate() {
    let step = frame % steps.length;
    steps[step]();
    ++frame;
  }
}

function createShader(gl, type, source) {
  let shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  let success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) { return shader; }

  console.log(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
}

function createProgram(gl, vertexShaderSource, fragmentShaderSource) {
  let vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  let fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  
  let program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  let success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) { return program; }

  console.log(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
}

function createAndSetupTexture(gl, wrapTexture = [false, false]) {
  let texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapTexture[0] ? gl.REPEAT : gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapTexture[1] ? gl.REPEAT : gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  return texture;
}

function setPositionAttribute(gl, positionLocation, buffer) {
  gl.enableVertexAttribArray(positionLocation);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
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

function main() {
  loadImages([
    "../fluidsim/initial.png", 
    "../fluidsim/source.png",
    "../fluidsim/boundaries.png",
  ], render);
}

main();