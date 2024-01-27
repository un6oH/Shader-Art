function createShader(gl, type, source) {
  let shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  let success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) { return shader; }

  console.log("createShader() Error from", (type == gl.VERTEX_SHADER ? "vertex shader" : "fragment shader"), gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
}

function createProgram(gl, vertexShaderSource, fragmentShaderSource, transformFeedbackVaryings = null, bufferMode = null) {
  let vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  let fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  
  let program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);

  if (transformFeedbackVaryings) {
    gl.transformFeedbackVaryings(program, transformFeedbackVaryings, bufferMode ? bufferMode : gl.SEPARATE_ATTRIBS);
  }

  gl.linkProgram(program);
  let success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) { return program; }

  console.log(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
}

function createLocations(gl, program, attributes, uniforms) {
  let locations = {};
  attributes.forEach((name) => {
    locations[name] = gl.getAttribLocation(program, name);
  });
  uniforms.forEach((name) => {
    locations[name] = gl.getUniformLocation(program, name);
  });
  return locations;
}

function createTexture(gl, params = null) {
  let texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  let p = params ? params : [gl.LINEAR, gl.LINEAR, gl.REPEAT, gl.REPEAT]; // default parameters
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, p[0]);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, p[1]);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, p[2]);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, p[3]);

  return texture;
}

function bindTextureToLocation(gl, location, index, texture) {
  gl.uniform1i(location, index);
  gl.activeTexture([gl.TEXTURE0, gl.TEXTURE1, gl.TEXTURE2, gl.TEXTURE3, gl.TEXTURE4, gl.TEXTURE5, gl.TEXTURE6, gl.TEXTURE7][index]);
  gl.bindTexture(gl.TEXTURE_2D, texture);
}

function createFramebuffer(gl, texture) {
  let framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  return framebuffer;
}

function setupFramebuffer(gl, framebuffer, texture) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
}

function makeBuffer(gl, data, usage) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, usage);
  return buffer;
}

function setupBuffer(gl, buffer, data, usage) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, usage);
}

function bindBuffer(gl, buffer, location, size, type, normalized = false, stride = 0, offset = 0) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, size, type, normalized, stride, offset);
}

function makeVertexArray(gl, buffers) {
  const vertexArray = gl.createVertexArray();
  gl.bindVertexArray(vertexArray);
  for (let [buffer, location, size, type] of buffers) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, type, false, 0, 0);
  }
  return vertexArray;
}

function makeTransformFeedback(gl, buffers) {
  const transformFeedback = gl.createTransformFeedback();
  gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, transformFeedback);
  buffers.forEach((buffer, index) => {
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, index, buffer);
  });
  gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  return transformFeedback;
}

function drawWithTransformFeedback(gl, transformFeedback, primitive, drawFunction) {
  gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, transformFeedback);
  gl.beginTransformFeedback(primitive);
  drawFunction();
  gl.endTransformFeedback();
  gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
}

function setFramebuffer(gl, framebuffer, width, height) { 
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.viewport(0, 0, width, height);
}

function drawTexture(gl, framebuffer = null, x = null, y = null, w = null, h = null) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.viewport(w ? x : 0, h ? y : 0, w ? w : x, h ? h : y);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}
