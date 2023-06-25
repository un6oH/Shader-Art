function main(image) {
  const canvas = document.querySelector("#gl-canvas");
  const gl = canvas.getContext("webgl2");
  if (!gl) { 
    alert("Unable to initialise WebGL"); 
    return; 
  }
  gl.getExtension('EXT_color_buffer_float');
  gl.getExtension('EXT_float_blend');
  gl.getExtension('OES_texture_float_linear');

  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  console.log("image dimensions", image.naturalWidth, "x", image.naturalHeight);

  console.log("creating set edges program");
  const setEdgesProgram = createProgram(gl, SET_EDGES_VS, FS, ["newX0", "newX1"]);
  const setEdgesLocations = createLocations(gl, setEdgesProgram, 
    ["prevX1", "y"], 
    ["image", "textureWidth", "threshold"]);

  console.log("creating set colour program");
  const setColourProgram = createProgram(gl, SET_COLOUR_VS, FS, ["colour"]);
  const setColourLocations = createLocations(gl, setColourProgram, 
    ["x0", "x1", "y"], 
    ["textureWidth", "image"]);

  console.log("creating compile coords program");
  const compileCoordsProgram = createProgram(gl, COMPILE_COORDS_VS, FS, ["v_x0", "v_y0", "v_x1", "v_y1"], gl.INTERLEAVED_ATTRIBS);
  const compileCoordsLocations = createLocations(gl, compileCoordsProgram, ["x0", "x1", "y"], []);

  console.log("creating duplicate colours program");
  const duplicateColourBufferProgram = createProgram(gl, DUPLICATE_COLOUR_BUFFER_VS, FS, ["v_colour", "v_copy"], gl.INTERLEAVED_ATTRIBS);
  const duplicateColourBufferLocations = createLocations(gl, duplicateColourBufferProgram, ["colour"], []);

  console.log("creating shade range program");
  const shadeRangeProgram = createProgram(gl, SHADE_RANGE_VS, SHADE_RANGE_FS);
  const shadeRangeLocations = createLocations(gl, shadeRangeProgram, 
    ["position", "colour"], 
    ["textureDimensions"]);

  console.log("creating display program");
  const displayProgram = createProgram(gl, DISPLAY_VS, DISPLAY_FS);
  const displayLocations = createLocations(gl, displayProgram, ["position"], ["image"]);
  
  const n = image.naturalHeight;
  const imageWidth = image.naturalWidth;

  const imageTexture = createTexture(gl);
  gl.bindTexture(gl.TEXTURE_2D, imageTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

  const x0Buffer = gl.createBuffer();
  setupBuffer(gl, x0Buffer, n * 4, gl.DYNAMIC_DRAW);

  const x1Buffers = [gl.createBuffer(), gl.createBuffer()];
  const initialX = new Array(n).fill(-1);
  setupBuffer(gl, x1Buffers[0], new Float32Array(initialX), gl.DYNAMIC_DRAW);
  setupBuffer(gl, x1Buffers[1], n * 4, gl.DYNAMIC_DRAW);

  const yBuffer = gl.createBuffer();
  const yCoords = new Array(n).fill(0).map((n, i) => i);
  setupBuffer(gl, yBuffer, new Float32Array(yCoords), gl.DYNAMIC_DRAW);

  // set edges buffer arrays
  const setEdgesVertexArrayA = makeVertexArray(gl, [
    [x1Buffers[0], setEdgesLocations.prevX1, 1, gl.FLOAT], 
    [yBuffer, setEdgesLocations.y, 1, gl.FLOAT], 
  ]);
  const setEdgesVertexArrayB = makeVertexArray(gl, [
    [x1Buffers[1], setEdgesLocations.prevX1, 1, gl.FLOAT], 
    [yBuffer, setEdgesLocations.y, 1, gl.FLOAT], 
  ]);
  const setEdgesVertexArrays = [setEdgesVertexArrayA, setEdgesVertexArrayB];

  const setEdgesTransformFeedbackA = makeTransformFeedback(gl, [x0Buffer, x1Buffers[1]]);
  const setEdgesTransformFeedbackB = makeTransformFeedback(gl, [x0Buffer, x1Buffers[0]]);
  const setEdgesTransformFeedbacks = [setEdgesTransformFeedbackA, setEdgesTransformFeedbackB];

  // set colour buffer arrays
  const setColourVertexArrayA = makeVertexArray(gl, [
    [x0Buffer, setColourLocations.x0, 1, gl.FLOAT], 
    [x1Buffers[1], setColourLocations.x1, 1, gl.FLOAT], 
    [yBuffer, setColourLocations.y, 1, gl.FLOAT], 
  ]);
  const setColourVertexArrayB = makeVertexArray(gl, [
    [x0Buffer, setColourLocations.x0, 1, gl.FLOAT], 
    [x1Buffers[0], setColourLocations.x1, 1, gl.FLOAT], 
    [yBuffer, setColourLocations.y, 1, gl.FLOAT], 
  ]);
  const setColourVertexArrays = [setColourVertexArrayA, setColourVertexArrayB];

  const colourBuffer = makeBuffer(gl, n * 4 * 4, gl.DYNAMIC_DRAW);
  const setColourTransformFeedback = makeTransformFeedback(gl, [colourBuffer]);

  // 
  const texture = createTexture(gl);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, image.naturalWidth, image.naturalHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  const framebuffer = createFramebuffer(gl, texture);

  const positionBuffer = makeBuffer(gl, n * 2 * 2 * 4, gl.DYNAMIC_DRAW);
  const compileCoordsVertexArrayA = makeVertexArray(gl, [
    [x0Buffer, compileCoordsLocations.x0, 1, gl.FLOAT], 
    [x1Buffers[1], compileCoordsLocations.x1, 1, gl.FLOAT], 
    [yBuffer, compileCoordsLocations.y, 1, gl.FLOAT], 
  ]);
  const compileCoordsVertexArrayB = makeVertexArray(gl, [
    [x0Buffer, compileCoordsLocations.x0, 1, gl.FLOAT], 
    [x1Buffers[0], compileCoordsLocations.x1, 1, gl.FLOAT], 
    [yBuffer, compileCoordsLocations.y, 1, gl.FLOAT], 
  ]);
  const compileCoordsVertexArrays = [compileCoordsVertexArrayA, compileCoordsVertexArrayB];
  const compileCoordsTransformFeedback = makeTransformFeedback(gl, [positionBuffer]);
  
  const duplicateColourBuffer = makeBuffer(gl, n * 4 * 2 * 4, gl.DYNAMIC_DRAW);
  const duplicateColourBufferVertexArray = makeVertexArray(gl, [[colourBuffer, duplicateColourBufferProgram.colour, 4, gl.FLOAT]]);
  const duplicateColourBufferTransformFeedback = makeTransformFeedback(gl, [duplicateColourBuffer]);

  // shade range buffer arrays
  const shadeRangeVertexArray = makeVertexArray(gl, [
    [positionBuffer, shadeRangeLocations.position, 2, gl.FLOAT], 
    [duplicateColourBuffer, shadeRangeLocations.colour, 4, gl.FLOAT], 
  ]);

  const displayVertexBuffer = makeBuffer(gl, new Float32Array([
    -1, 1, 1, 1, 1, -1, 
    -1, 1, 1, -1, -1, -1, 
  ]), gl.STATIC_DRAW);
  const displayVertexArray = makeVertexArray(gl, [[displayVertexBuffer, displayLocations.position, 2, gl.FLOAT]]);


  function step(i) {
    console.log("step");
    gl.enable(gl.RASTERIZER_DISCARD);
    
    // set edges
    gl.useProgram(setEdgesProgram);
    gl.bindVertexArray(setEdgesVertexArrays[i % 2]);
    bindTextureToLocation(gl, setEdgesLocations.image, 0, imageTexture);
    gl.uniform1f(setEdgesLocations.textureWidth, imageWidth);
    gl.uniform1f(setEdgesLocations.threshold, threshold);
    drawWithTransformFeedback(gl, setEdgesTransformFeedbacks[i % 2], gl.POINTS, () => { gl.drawArrays(gl.POINTS, 0, n); });
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    // set colours;
    gl.useProgram(setColourProgram);
    gl.bindVertexArray(setColourVertexArrays[i % 2]);
    gl.uniform1f(setColourLocations.textureWidth, imageWidth);
    bindTextureToLocation(gl, setColourLocations.image, 0, imageTexture);
    drawWithTransformFeedback(gl, setColourTransformFeedback, gl.POINTS, () => { gl.drawArrays(gl.POINTS, 0, n); });
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    
    // setup shade range buffers
    gl.useProgram(compileCoordsProgram);
    gl.bindVertexArray(compileCoordsVertexArrays[i % 2]);
    drawWithTransformFeedback(gl, compileCoordsTransformFeedback, gl.POINTS, () => { gl.drawArrays(gl.POINTS, 0, n); });

    gl.useProgram(duplicateColourBufferProgram);
    gl.bindVertexArray(duplicateColourBufferVertexArray);
    drawWithTransformFeedback(gl, duplicateColourBufferTransformFeedback, gl.POINTS, () => { gl.drawArrays(gl.POINTS, 0, n); });
    
    gl.disable(gl.RASTERIZER_DISCARD);

    // shade range
    gl.useProgram(shadeRangeProgram);
    setFramebuffer(gl, framebuffer, image.naturalWidth, image.naturalHeight);
    gl.bindVertexArray(shadeRangeVertexArray);
    gl.uniform2f(shadeRangeLocations.textureDimensions, image.naturalWidth, image.naturalHeight);
    gl.drawArrays(gl.LINES, 0, n * 2);
  }

  function display() {
    gl.useProgram(displayProgram);
    setFramebuffer(gl, null, canvas.width, canvas.height);
    gl.bindVertexArray(displayVertexArray);
    bindTextureToLocation(gl, displayLocations.image, 0, texture);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function printBuffer(buffer, size, label) {
    let results = new Float32Array(n * size);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.getBufferSubData(gl.ARRAY_BUFFER, 0, results);
    console.log(label + ":", results);
  }

  // let results = new Int32Array(n);
  // gl.bindBuffer(gl.ARRAY_BUFFER, x1Buffers[0]);
  // gl.getBufferSubData(gl.ARRAY_BUFFER, 0, results)
  // console.log(results);

  let threshold = 0.2;

  let j = 0;
  document.addEventListener("click", () => {
    step(j);
    display();
    printBuffer(duplicateColourBuffer, 8, "colour (duplicated)");
    j++;
  });

  let complete = false;
  function checkComplete() {
    let x0 = new Float32Array(n);
    gl.bindBuffer(gl.ARRAY_BUFFER, x0Buffer);
    gl.getBufferSubData(gl.ARRAY_BUFFER, 0, x0);
    complete = true;
    for (let n of x0) {
      if (n != image.naturalWidth) {
        complete = false;
        break;
      }
    }
  }

  function full() {
    for (let s = 0; s < image.naturalWidth; s++) {
      step(s);
      checkComplete();
      if (complete) break;
    }
    display();
  }

  document.addEventListener("keypress", full);
}

function setup() {
  let image = new Image();
  image.src = "just grass.JPG"
  image.onload = () => {
    main(image);
  };
}

setup();