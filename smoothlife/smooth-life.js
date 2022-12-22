function render(images) {
  // initialise canvas
  const canvas = document.querySelector("#gl-canvas");
  const gl = canvas.getContext("webgl");
  if (!gl) { 
    alert("Unable to initialise WebGL"); 
    return; 
  }

  // set canvas size to client canvas size
  canvas.width = gl.canvas.clientWidth;
  canvas.height = gl.canvas.clientHeight;

  // initialise program
  const vertexShaderSource = VERTEX_SHADER;
  const fragmentShaderSource = FRAGMENT_SHADER;
  const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);

  // image references
  const inputImage = images[0];

  // set texture size to input image size
  const textureWidth = inputImage.width;
  const textureHeight = inputImage.height;
  const wrapTexture = false;


  // buffers
  const positionBuffer = gl.createBuffer(gl.ARRAY_BUFFER);
  const texCoordBuffer = gl.createBuffer(gl.ARRAY_BUFFER);

  // get data locations
  const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
  const texCoordAttributeLocation = gl.getAttribLocation(program, "a_texCoord");
  
  const canvasResolutionUniformLocation = gl.getUniformLocation(program, "u_canvasResolution");
  const textureSizeUniformLocation = gl.getUniformLocation(program, "u_textureSize");
  const updateCellsUniformLocation = gl.getUniformLocation(program, "u_updateCells");
  const deltaTimeUniformLocation = gl.getUniformLocation(program, "u_deltaTimeSeconds");

  const displayUniformLocation = gl.getUniformLocation(program, "u_display");

  const imageUniformLocation = gl.getUniformLocation(program, "u_image");
  
  //
  // render time
  //
  // set up canvas
  gl.useProgram(program);

  // position pointer
  gl.enableVertexAttribArray(positionAttributeLocation);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

  // texture coordinate pointer
  gl.enableVertexAttribArray(texCoordAttributeLocation);
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.vertexAttribPointer(texCoordAttributeLocation, 2, gl.FLOAT, false, 0, 0);
  
  // textures
  const inputImageTexture = createAndSetupTexture(gl, wrapTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, inputImage); // put image.png in the texture;
  
  // bind textures to framebuffers
  const textures = [];
  const framebuffers = [];
  for (let i = 0; i < 2; ++i) {
    let texture = createAndSetupTexture(gl, wrapTexture);
    textures.push(texture);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA, textureWidth, textureHeight, 0,
      gl.RGBA, gl.UNSIGNED_BYTE, null);
      
    let framebuffer = gl.createFramebuffer();
    framebuffers.push(framebuffer);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  }

  // set resolution uniforms
  gl.uniform2f(canvasResolutionUniformLocation, canvas.width, canvas.height);
  gl.uniform2f(textureSizeUniformLocation, textureWidth, textureHeight);

  // set texture units
  gl.uniform1i(imageUniformLocation, 0);
  gl.activeTexture(gl.TEXTURE0); // set texture unit to 0 for simulations

  //
  // draw
  //
  gl.clearColor(0, 0, 0, 1);

  // load initial texture
  initialise();

  // display original texture
  draw();

  // animation 
  const framesPerUpdate = 1;
  let frame = 1;
  let step = 0;
  let deltaTime = 0.05;
  gl.uniform1f(deltaTimeUniformLocation, deltaTime);
  requestAnimationFrame(animate);
  function animate() {
    if (frame % framesPerUpdate === 0) {
      // update cells by drawing to a framebuffer
      update();
      
      // draw to canvas
      draw();
    }

    frame ++;
    requestAnimationFrame(animate);
  }

  // initialise texture with input image
  function initialise() {
    setFramebuffer(framebuffers[1], textureWidth, textureHeight);
    gl.bindTexture(gl.TEXTURE_2D, inputImageTexture);
    gl.uniform1i(updateCellsUniformLocation, 0);
    gl.uniform1i(displayUniformLocation, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    setRectangle(gl, 0, 0, textureWidth, textureHeight);
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    setRectangle(gl, 0, 0, textureWidth, textureHeight);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.bindTexture(gl.TEXTURE_2D, textures[1]);
  }

  function update() {
    // console.log("update()");

    setFramebuffer(framebuffers[step % 2], textureWidth, textureHeight);
    gl.uniform1i(updateCellsUniformLocation, 1);
    gl.uniform1i(displayUniformLocation, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    setRectangle(gl, 0, 0, textureWidth, textureHeight);
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    setRectangle(gl, 0, 0, textureWidth, textureHeight);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.bindTexture(gl.TEXTURE_2D, textures[step % 2]);

    step ++;
  }

  // display to canvas
  function draw() {
    setFramebuffer(null, canvas.width, canvas.height);
    gl.uniform1i(updateCellsUniformLocation, 0);
    gl.uniform1i(displayUniformLocation, 1);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    setRectangle(gl, 0, 0, canvas.width, canvas.height);
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    setRectangle(gl, 0, 0, textureWidth, textureHeight);
    
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  
  // set framebuffer and viewport
  function setFramebuffer(fbo, width, height) { 
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, width, height);
    gl.clear(gl.COLOR_BUFFER_BIT);
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

function setRectangle(gl, x, y, width, height) {
  let x1 = x;
  let y1 = y;
  let x2 = x + width;
  let y2 = y + height;
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      x1, y1, 
      x2, y1, 
      x2, y2, 
      x1, y1, 
      x2, y2, 
      x1, y2
    ]),
    gl.STATIC_DRAW);
}

function createAndSetupTexture(gl, wrapTexture = false) {
  let texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapTexture ? gl.REPEAT : gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapTexture ? gl.REPEAT : gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  return texture;
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
    "../image.png",
  ], render);
}

main();