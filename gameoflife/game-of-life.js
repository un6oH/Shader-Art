function render(image) {
  // initialise canvas
  const canvas = document.querySelector("#gl-canvas");
  const gl = canvas.getContext("webgl");
  if (!gl) { 
    alert("Unable to initialise WebGL"); 
    return; 
  }
  canvas.width = image.width;
  canvas.height = image.height;

  // initialise program
  const vertexShaderSource = VERTEX_SHADER;
  const fragmentShaderSource = FRAGMENT_SHADER;
  const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);

  // create position buffer
  const positionBuffer = gl.createBuffer(gl.ARRAY_BUFFER);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  setRectangle(gl, 0, 0, canvas.width, canvas.height);

  // texture coordinates
  const texCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      0, 0, 
      1, 0,
      1, 1, 
      0, 0, 
      1, 1, 
      0, 1
    ]),
    gl.STATIC_DRAW);

  // get data locations
  const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
  const texCoordAttributeLocation = gl.getAttribLocation(program, "a_texCoord");
  
  const resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");
  const textureSizeUniformLocation = gl.getUniformLocation(program, "u_textureSize");
  const updateCellsUniformLocation = gl.getUniformLocation(program, "u_updateCells");
  
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

  // set texture size
  gl.uniform2f(textureSizeUniformLocation, image.width, image.height);

  // create framebuffers and textures
  const originalImageTexture = createAndSetupTexture(gl);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image); // put image.png in the texture;

  const textures = [];
  const framebuffers = [];
  for (let i = 0; i < 2; ++i) {
    let texture = createAndSetupTexture(gl);
    textures.push(texture);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA, image.width, image.height, 0,
      gl.RGBA, gl.UNSIGNED_BYTE, null);

    let framebuffer = gl.createFramebuffer();
    framebuffers.push(framebuffer);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  }

  //
  // draw
  //
  // start with original image
  gl.bindTexture(gl.TEXTURE_2D, originalImageTexture);

  setFramebuffer(null, canvas.width, canvas.height);
  gl.uniform1i(updateCellsUniformLocation, 0);
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  const framesPerUpdate = 1;
  let frame = 1;
  let step = 0;
  requestAnimationFrame(animate);

  function animate() {
    if (frame % framesPerUpdate === 0) {
      // update cells by drawing to a framebuffer
      update();

      // draw to canvas
      setFramebuffer(null, canvas.width, canvas.height);
      gl.uniform1i(updateCellsUniformLocation, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    frame ++;
    requestAnimationFrame(animate);
  }

  function update() {
    console.log("update()")
    
    // draw to framebuffer
    setFramebuffer(framebuffers[step % 2], image.width, image.height);
    gl.uniform1i(updateCellsUniformLocation, 1);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindTexture(gl.TEXTURE_2D, textures[step % 2]);

    step ++;
  }

  function setFramebuffer(fbo, width, height) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.uniform2f(resolutionUniformLocation, width, height);
    gl.viewport(0, 0, width, height);
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

function createAndSetupTexture(gl) {
  let texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  return texture;
}

function main() {
  const image = new Image();
  image.src = "../gameoflife/image.png";
  image.onload = () => {
    render(image);
  }
}

main();