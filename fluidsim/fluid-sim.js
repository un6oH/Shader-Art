const SET_FIELD = 0;
const SET_INPUT = 1;
const UPDATE = 2;
const DISPLAY = 3;

function render(images) {
  // initialise canvas
  const canvas = document.querySelector("#gl-canvas");
  const gl = canvas.getContext("webgl");
  if (!gl) { 
    alert("Unable to initialise WebGL"); 
    return; 
  }
  
  console.log("Simulating " + textureWidth + ", " + textureHeight + " grid, output to " + canvas.width + ", " + canvas.height + " canvas");

  //
  // global variables
  //
  // set canvas size to client canvas size
  canvas.width = gl.canvas.clientWidth;
  canvas.height = gl.canvas.clientHeight;

  // image objects
  const source = images[0];
  const boundaries = images[1];

  // set texture size to input image size
  const textureWidth = initialField.width;
  const textureHeight = initialField.height;
  const wrapTexture = [true, true];

  // create position buffer
  const positionBuffer = gl.createBuffer(gl.ARRAY_BUFFER);

  // create field
  const sourceFieldTexture = createAndSetupTexture(gl);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);

  const fieldTextures = [];
  const fieldFramebuffers = [];
  const pFieldTextures = [];
  const pFieldFramebuffers = [];
  for (let i = 0; i < 2; ++i) {
    // create texture
    let fieldTexture = createAndSetupTexture(gl);
    fieldTextures.push(fieldTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, textureWidth, textureHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    
    // create framebuffer
    let fieldFramebuffer = gl.createFramebuffer();
    fieldFramebuffers.push(fieldFramebuffer);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fieldFramebuffer);

    // attach texture to framebuffer
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fieldTexture, 0);

    // p field texture
    let pFieldTexture = createAndSetupTexture(gl);
    pFieldTextures.push(pFieldTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, textureWidth, textureHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    let pFieldFramebuffer = gl.createFramebuffer();
    pFieldFramebuffers.push(pFieldFramebuffer);
    gl.bindFramebuffer(gl.FRAMEBUFFER, pFieldFramebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, pFieldTexture, 0);
  }

  let fieldStep = 0;
  let pFieldStep = 0;

  gl.clearColor(0, 0, 0, 1);

  const VELOCITY_FIELD = 0;
  const DENSITY_FIELD = 1;

  const RELAXATION_STEPS = 20;

  //
  // simulation parameters
  //
  const diffusionRate = 1;
  const deltaTime = 0.05;
  const boundariesTexture = createAndSetupTexture(gl);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, boundaries);

  //
  // initialisation time
  //
  // initialise add source program
  const addSourceProgram = createProgram(gl, BUFFER_VERT, ADD_SOURCE);
  const addSourceDataLocations = {
    position: gl.getAttribLocation(addSourceProgram, "a_position"),
    textureResolution: gl.getUniformLocation(addSourceProgram, "u_textureResolution"),
    source: gl.getUniformLocation(addSourceProgram, "u_source"),
    field: gl.getUniformLocation(addSourceProgram, "u_field"),
    deltaTime: gl.getUniformLocation(addSourceProgram, "u_deltaTime"),
  };
  gl.uniform2f(addSourceDataLocations.textureResolution, textureWidth, textureHeight);
  gl.uniform1i(addSourceDataLocations.field, 0);
  gl.uniform1i(addSourceDataLocations.source, 1);
  gl.uniform1f(addSourceDataLocations.deltaTime, deltaTime);
  
  // initialise diffuse program
  const diffuseProgram = createProgram(gl, BUFFER_VERT, DIFFUSE_FRAG);
  const diffuseDataLocations = {
    position: gl.getAttribLocation(diffuseProgram, "a_position"), 
    textureResolution: gl.getUniformLocation(diffuseProgramm, "u_textureResolution"), 
    field: gl.getUniformLocation(diffuseProgramm, "u_field"), 
    diffusionRate: gl.getUniformLocation(diffuseProgramm, "u_diffusionRate"), 
    deltaTime: gl.getUniformLocation(diffuseProgramm, "u_deltaTime"), 
    fieldType: gl.getUniformLocation(diffuseProgramm, "u_fieldType"), 
  };
  gl.uniform2f(diffuseDataLocations.textureResolution, textureWidth, textureHeight);
  gl.uniform1i(diffuseDataLocations.field, 0);
  gl.uniform1f(diffuseDataLocations.diffusionRate, diffusionRate);
  gl.uniform1f(diffuseDataLocations.deltaTime, deltaTime);

  // initialise advect program
  const advectProgram = createProgram(gl, BUFFER_VERT, ADVECT_FRAG);
  const advectDataLocations = {
    position: gl.getAttribLocation(advectProgram, "a_position"), 
    textureResolution: gl.getUniformLocation(advectProgram, "u_textureResolution"),
    field: gl.getUniformLocation(advectProgram, "u_field"), 
    deltaTime: gl.getUniformLocation(advectProgram, "u_deltaTime"), 
    fieldType: gl.getUniformLocation(advectProgram, "u_fieldType"), 
  };
  setPositionAttribute(gl, advectDataLocations.position, positionBuffer, textureWidth, textureHeight);
  gl.uniform2f(advectDataLocations.textureResolution, textureWidth, textureHeight);
  gl.uniform1i(advectDataLocations.field, 0);
  gl.uniform1f(advectDataLocations.deltaTime, deltaTime);

  //
  // initialise programs for project function
  //
  // calc div field
  const calcDivFieldProgram = createProgram(gl, BUFFER_VERT, CALC_DIV_FIELD_FRAG);
  const calcDivFieldDataLocations = {
    position: gl.getAttribLocation(projectProgram, "a_position"), 
    textureResolution: gl.getUniformLocation(projectProgram, "u_textureResolution"), 
    field: gl.getUniformLocation(projectProgram, "u_field"), 
    h: gl.getUniformLocation(projectProgram, "h"), 
  }
  setPositionAttribute(gl, calcDivFieldDataLocations.position, positionBuffer, textureWidth, textureHeight);
  gl.uniform2f(calcDivFieldDataLocations.textureResolution, textureWidth, textureHeight);
  gl.uniform1i(calcDivFieldDataLocations.field, 0);
  gl.uniform1f(calcDivFieldDataLocations.h, 1.0 / Math.sqrt(textureWidth * textureHeight));
  
  const divFieldTexture = createAndSetupTexture(gl);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, textureWidth, textureHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  const divFieldFramebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fieldFramebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, divFieldTexture, 0);

  // calc gradient field
  const calcGradientFieldProgram = createProgram(gl, BUFFER_VERT, CALC_GRADIENT_FIELD_FRAG);
  const calcGradientFieldDataLocations = {
    position: gl.getAttribLocation(calcGradientFieldProgram, "a_position"), 
    textureResolution: gl.getUniformLocation(calcGradientFieldProgram, "u_textureResolution"), 
    gradientField: gl.getUniformLocation(calcGradientFieldProgram, "u_gradientField"), 
    divField: gl.getUniformLocation(calcGradientFieldProgram, "u_divField"), 
  }
  setPositionAttribute(gl, calcGradientFieldDataLocations.position, positionBuffer, textureWidth, textureHeight);
  gl.uniform2f(calcGradientFieldDataLocations.textureResolution, textureWidth, textureHeight);
  gl.uniform1i(calcGradientFieldDataLocations.gradientField, 0);
  gl.uniform1i(calcGradientFieldDataLocations.divField, 1);
  // calc mass conserving field
  const calcMassConservingFieldProgram = createProgram(gl, BUFFER_VERT, CALC_MASS_CONSERVING_FIELD_FRAG);
  const calcMassConservingFieldDataLocations = {
    position: gl.getAttribLocation(calcMassConservingFieldProgram, "a_position"), 
    textureResolution: gl.getUniformLocation(calcMassConservingFieldProgram, "u_textureResolution"), 
    field: gl.getUniformLocation(calcMassConservingFieldProgram, "u_field"), 
    gradientField: gl.getUniformLocation(calcMassConservingFieldProgram, "u_gradientField"), 
    h: gl.getUniformLocation(calcMassConservingFieldProgram, "h"), 
  }
  setPositionAttribute(gl, calcMassConservingFieldDataLocations.position, positionBuffer, textureWidth, textureHeight);
  gl.uniform2f(calcMassConservingFieldDataLocations.textureResolution, textureWidth, textureHeight);
  gl.uniform1i(calcMassConservingFieldDataLocations.field, 0);
  gl.uniform1i(calcMassConservingFieldDataLocations.gradientField, 1);
  gl.uniform1f(calcMassConservingFieldDataLocations.h, 1.0 / Math.sqrt(textureWidth * textureHeight));

  // initialise set boundaries program
  const setBoundariesProgram = createProgram(gl, BUFFER_VERT, SET_BOUNDARIES_FRAG);
  const setBoundariesDataLocations = {
    position: gl.getAttribLocation(setBoundariesProgram, "a_position"), 
    textureResolution: gl.getUniformLocation(setBoundariesProgram, "u_textureResolution"), 
    boundaries: gl.getUniformLocation(setBoundariesProgram, "u_boundaries"), 
    field: gl.getUniformLocation(setBoundariesProgram, "u_field"), 
  };
  gl.uniform2f(setBoundariesDataLocations.textureResolution, textureWidth, textureHeight);
  gl.uniform1i(setBoundariesDataLocations.field, 0);
  gl.uniform1i(setBoundariesDataLocations.boundaries, 1);

  // initialise display program
  const displayProgram = createProgram(gl, CANVAS_VERT, DISPLAY_FRAG);
  const displayDataLocations = {
    position: gl.getAttribLocation(displayProgram, "a_position"), 
    canvasResolution: gl.getUniformLocation(displayProgram, "u_canvasResolution"), 
    image: gl.getUniformLocation(displayProgram, "u_image"), 
  }
  setPositionAttribute(gl, displayDataLocations.position, positionBuffer, canvas.width, canvas.height);
  gl.uniform1i(displayProgram.image, 0);

  //
  // functions
  //
  function addSource() {
    gl.useProgram(addSourceProgram);

    setPositionAttribute(gl, addSourceDataLocations.position, positionBuffer, textureWidth, textureHeight);
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fieldTextures[fieldStep % 2]);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, sourceFieldTexture);

    fieldStep++;

    setFramebuffer(fieldFramebuffers[fieldStep % 2], textureWidth, textureHeight);
    

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function diffuse(fieldType) {
    for (let i = 0; i < RELAXATION_STEPS; ++i) {
      gl.useProgram(diffuseProgram);

      setPositionAttribute(gl, diffuseDataLocations.position, positionBuffer, textureWidth, textureHeight);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, fieldTextures[fieldStep % 2]);
  
      ++fieldStep;
  
      setFramebuffer(fieldFramebuffers[fieldStep & 2], textureWidth, textureHeight);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
  
      if (fieldType == VELOCITY_FIELD); {
        setBoundaries();
      }
    }
  }

  function advect(fieldType) {
    gl.useProgram(advectProgram);

    setPositionAttribute(gl, advectDataLocations.position, positionBuffer, textureWidth, textureHeight);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fieldTextures[fieldStep % 2]);

    ++fieldStep;

    setFramebuffer(fieldFramebuffers[fieldStep & 2], textureWidth, textureHeight);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    if (fieldType == VELOCITY_FIELD) {
      setBoundaries();
    }
  }

  function project() {
    // calculate div field
    gl.useProgram(calcDivFieldProgram);

    setPositionAttribute(gl, calcDivFieldDataLocations.position, positionBuffer, textureWidth, textureHeight);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fieldTextures[fieldStep % 2]);

    setFramebuffer(divFieldFramebuffer, textureWidth, textureHeight);
    drawArrays(gl.TRIANGLES, 0, 6);

    // calculate gradient field
    gl.useProgram(calcGradientFieldProgram);
    setFramebuffer(pFieldFramebuffers[pFieldStep % 2], textureWidth, textureHeight);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, divFieldTexture);
    for (let i = 0; i < RELAXATION_STEPS; ++i) {
      setPositionAttribute(gl, calcGradientFieldDataLocations.position, positionBuffer, textureWidth, textureHeight);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, pFieldTextures[pFieldStep % 2]);

      ++pFieldStep;

      setFramebuffer(pFieldFramebuffers[pFieldStep % 2], textureWidth, textureHeight);
      drawArrays(gl.TRIANGLES, 0, 6);
    }

    // calculate mass conserving field
    gl.useProgram(calcMassConservingFieldProgram);
    setPositionAttribute(gl, calcMassConservingFieldDataLocations.position, positionBuffer, textureWidth, textureHeight);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fieldTextures[fieldStep % 2]);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, pFieldTextures[pFieldStep % 2]);

    ++fieldStep;
    
    setFramebuffer(fieldFramebuffers[fieldStep % 2]);
    drawArrays(gl.TRIANGLES, 0, 6);
  }

  function setBoundaries() {
    gl.useProgram(setBoundariesProgram);

    setPositionAttribute(gl, setBoundariesDataLocations.position, positionBuffer, textureWidth, textureHeight);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fieldTextures[fieldStep % 2]);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, boundariesTexture);

    ++fieldStep;

    setFramebuffer(fieldFramebuffers[fieldStep % 2], textureWidth, textureHeight);
    drawArrays(gl.TRIANGLES, 0, 6);
  }

  function display() {
    gl.useProgram(displayProgram);

    setPositionAttribute(gl, displayDataLocations.position, positionBuffer, canvas.width, canvas.height);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fieldTextures[fieldStep % 2]);

    setFramebuffer(null, canvas.width, canvas.height);
    drawArrays(gl.TRIANGLES, 0, 6);
  }

  function setFramebuffer(fbo, width, height) { 
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, width, height);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  // animation
  requestAnimationFrame(update);
  function update() {
    // add sources and forces
    addSource();

    // velocity step
    diffuse(VELOCITY_FIELD);
    project();
    advect(VELOCITY_FIELD);
    project();

    // density step
    diffuse(DENSITY_FIELD);
    advect(DENSITY_FIELD);

    // draw to canvas
    display();

    requestAnimationFrame(update);
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

function setPositionAttribute(gl, positionLocation, positionBuffer, width, height) {
  gl.enableVertexAttribArray(positionLocation);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    0, 0, width, 0, width, height, 
    0, 0, width, height, 0, height
  ]), gl.STATIC_DRAW);
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
    "../fluidsim/source.png",
    "../fluidsim/boundaries.png",
  ], render);
}

main();