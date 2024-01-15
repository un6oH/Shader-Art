function render(images) {
  // initialise canvas
  const canvas = document.querySelector("#gl-canvas");
  const gl = canvas.getContext("webgl2");
  if (!gl) { 
    alert("Unable to initialise WebGL"); 
    return; 
  }
  gl.getExtension("OES_texture_float_linear");
  gl.getExtension("EXT_color_buffer_float");

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

  if (initial.width != source.width || initial.width != boundaries.width || source.width != boundaries.width || 
      initial.height != source.height || initial.height != boundaries.height || source.height != boundaries.height) {
    console.log("Error: source images do not have same dimensions. Cannot run program.");
    return;
  }

  // set texture size to input image size
  const textureWidth = source.width;
  const textureHeight = source.height;
  
  console.log("Simulating " + textureWidth + ", " + textureHeight + " grid, output to " + canvas.width + ", " + canvas.height + " canvas");
  
  //
  // simulation parameters
  //
  const params = {
    imageConvertScale: 1, 
    deltaTime: 1.0 / 240.0, 
    inputMode: 0, 
    splatDensity: 1, 
    splatRadius: 10, 
    diffusionRate: 1, 
    overRelaxation: 0, 
    boundaryFriction: 0.05, 
    displayMode: 0, 
    showBoundaries: true, 
  };

  const RELAXATION_STEPS = 20;
  
  const initialImage = createTexture(gl); // converted to field
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, initial);
  const sourceImage = createTexture(gl); // converted to field
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  const boundariesTexture = createTexture(gl);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, boundaries);
  
  // field textures
  const fieldTextures = [];
  const fieldFramebuffers = [];
  for (let i = 0; i < 2; i++) {
    let texture = createTexture(gl);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, textureWidth, textureHeight, 0, gl.RGBA,  gl.FLOAT, null);
    fieldTextures.push(texture); 

    fieldFramebuffers.push(createFramebuffer(gl, texture));
  }
  const currentFieldTexture = createTexture(gl);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, textureWidth, textureHeight, 0, gl.RGBA,  gl.FLOAT, null);
  const prevFieldTexture = createTexture(gl);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, textureWidth, textureHeight, 0, gl.RGBA,  gl.FLOAT, null);

  // image to field program
  console.log("creating image to field program...");
  const imageToFieldProgram = createProgram(gl, TEXTURE_VS, IMAGE_TO_FIELD_FS);
  const imageToFieldLocations = createLocations(gl, imageToFieldProgram, 
    ["position"], 
    ["image", "scale"]
  );
  const sourceTexture = createTexture(gl);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, textureWidth, textureHeight, 0, gl.RGBA,  gl.FLOAT, null);
  const sourceTextureFramebuffer = createFramebuffer(gl, sourceTexture);

  // add source program
  console.log("creating add source program...");
  const addSourceProgram = createProgram(gl, TEXTURE_VS, ADD_SOURCE_FS);
  const addSourceLocations = createLocations(gl, addSourceProgram, 
    ["position"], 
    ["fieldTexture", "sourceTexture", "textureDimensions", "deltaTime", "inputMode", "mousePos", "mouseVel", "splatDensity", "splatRadius"]
  );
  gl.useProgram(addSourceProgram);
  gl.uniform1i(addSourceLocations.fieldTexture, 0);
  gl.uniform1i(addSourceLocations.sourceTexture, 1);
  gl.uniform2f(addSourceLocations.textureDimensions, textureWidth, textureHeight);
  
  // diffuse velocity program
  console.log("creating diffuse velocity program...");
  const diffuseVelocityProgram = createProgram(gl, DIFFUSE_VS, DIFFUSE_VELOCITY_FS);
  const diffuseVelocityLocations = createLocations(gl, diffuseVelocityProgram, 
    ["position"], 
    ["textureDimensions", "field0Texture", "fieldTexture", "diffusionRate", "deltaTime"]
  );
  gl.useProgram(diffuseVelocityProgram);
  gl.uniform2f(diffuseVelocityLocations.textureDimensions, textureWidth, textureHeight);
  gl.uniform1i(diffuseVelocityLocations.field0Texture, 0);
  gl.uniform1i(diffuseVelocityLocations.fieldTexture, 1);

  // diffuse density program
  console.log("creating diffuse density program...");
  const diffuseDensityProgram = createProgram(gl, DIFFUSE_VS, DIFFUSE_DENSITY_FS);
  const diffuseDensityLocations = createLocations(gl, diffuseDensityProgram, 
    ["position"], 
    ["textureDimensions", "field0Texture", "fieldTexture", "diffusionRate", "deltaTime"]
  );
  gl.useProgram(diffuseDensityProgram);
  gl.uniform2f(diffuseDensityLocations.textureDimensions, textureWidth, textureHeight);
  gl.uniform1i(diffuseDensityLocations.field0Texture, 0);
  gl.uniform1i(diffuseDensityLocations.fieldTexture, 1);

  // advect velocity program
  console.log("creating advect velocity program...");
  const advectVelocityProgram = createProgram(gl, TEXTURE_VS, ADVECT_VELOCITY_FS);
  const advectVelocityLocations = createLocations(gl, advectVelocityProgram, 
    ["position"], 
    ["fieldTexture", "textureDimensions", "deltaTime"]
  );
  gl.useProgram(advectVelocityProgram);
  gl.uniform2f(advectVelocityLocations.textureDimensions, textureWidth, textureHeight);

  // advect density program
  console.log("creating advect density program...");
  const advectDensityProgram = createProgram(gl, TEXTURE_VS, ADVECT_DENSITY_FS);
  const advectDensityLocations = createLocations(gl, advectDensityProgram, 
    ["position"], 
    ["fieldTexture", "textureDimensions", "deltaTime"]
  );
  gl.useProgram(advectDensityProgram);
  gl.uniform2f(advectDensityLocations.textureDimensions, textureWidth, textureHeight);

  // calc div field program
  console.log("creating calc div field program...");
  const calcDivFieldProgram = createProgram(gl, DIFFUSE_VS, CALC_DIV_FIELD_FS);
  const calcDivFieldLocations = createLocations(gl, calcDivFieldProgram, 
    ["position"], 
    ["fieldTexture", "textureDimensions", "h"]
  );
  gl.useProgram(calcDivFieldProgram)
  gl.uniform2f(calcDivFieldLocations.textureDimensions, textureWidth, textureHeight);
  gl.uniform1f(calcDivFieldLocations.h, 1.0 / Math.sqrt(textureWidth + textureHeight));
  const divFieldTexture = createTexture(gl);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, textureWidth, textureHeight, 0, gl.RED, gl.FLOAT, null);
  const divFieldFramebuffer = createFramebuffer(gl, divFieldTexture);

  // calc gradient field program
  console.log("creating calc gradient field program...");
  const calcGradientFieldProgram = createProgram(gl, DIFFUSE_VS, CALC_GRADIENT_FIELD_FS);
  const calcGradientFieldLocations = createLocations(gl, calcGradientFieldProgram, 
    ["position"], 
    ["textureDimensions", "gradientField", "divField", "overRelaxation"]
  );
  gl.useProgram(calcGradientFieldProgram)
  gl.uniform2f(calcGradientFieldLocations.textureDimensions, textureWidth, textureHeight);
  gl.uniform1i(calcGradientFieldLocations.gradientField, 0);
  gl.uniform1i(calcGradientFieldLocations.divField, 1);
  const gradientFieldTextures = [];
  const gradientFieldFramebuffers = [];
  for (let i = 0; i < 2; i++) {
    let texture = createTexture(gl);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, textureWidth, textureHeight, 0, gl.RED, gl.FLOAT, null);
    gradientFieldTextures.push(texture); 

    gradientFieldFramebuffers.push(createFramebuffer(gl, texture));
  }

  // calc mass conserving field program
  console.log("creating calc mass conserving field program...");
  const calcMassConservingFieldProgram = createProgram(gl, DIFFUSE_VS, CALC_MASS_CONSERVING_FIELD_FS);
  const calcMassConservingFieldLocations = createLocations(gl, calcMassConservingFieldProgram, 
    ["position"], 
    ["textureDimensions", "fieldTexture", "gradientField"]
  );
  gl.useProgram(calcMassConservingFieldProgram)
  gl.uniform2f(calcMassConservingFieldLocations.textureDimensions, textureWidth, textureHeight);
  gl.uniform1i(calcMassConservingFieldLocations.fieldTexture, 0);
  gl.uniform1i(calcMassConservingFieldLocations.gradientField, 1);

  // set boundary velocity program
  console.log("creating set boundary velocity program...");
  const setBoundaryVelocityProgram = createProgram(gl, TEXTURE_VS, SET_BOUNDARY_VELOCITY_FS);
  const setBoundaryVelocityLocations = createLocations(gl, setBoundaryVelocityProgram, 
    ["position"], 
    ["boundaries", "fieldTexture", "textureDimensions", "boundaryFriction"]
  );
  gl.useProgram(setBoundaryVelocityProgram);
  gl.uniform2f(setBoundaryVelocityLocations.textureDimensions, textureWidth, textureHeight);
  gl.uniform1i(setBoundaryVelocityLocations.boundaries, 0);
  gl.uniform1i(setBoundaryVelocityLocations.fieldTexture, 1);

  // set boundary density program
  console.log("creating set boundary density program...");
  const setBoundaryDensityProgram = createProgram(gl, DIFFUSE_VS, SET_BOUNDARY_DENSITY_FS);
  const setBoundaryDensityLocations = createLocations(gl, setBoundaryDensityProgram, 
    ["position"], 
    ["boundaries", "fieldTexture", "textureDimensions"]
  );
  gl.useProgram(setBoundaryDensityProgram);
  gl.uniform2f(setBoundaryDensityLocations.textureDimensions, textureWidth, textureHeight);
  gl.uniform1i(setBoundaryDensityLocations.boundaries, 0);
  gl.uniform1i(setBoundaryDensityLocations.fieldTexture, 1);

  // copy field program
  console.log("creating draw texture program...");
  const drawTextureProgram = createProgram(gl, TEXTURE_VS, DRAW_TEXTURE_FS);
  const drawTextureLocations = createLocations(gl, drawTextureProgram, ["position"], ["u_texture", "clampField"]);

  // display program
  console.log("creating display program...");
  const displayProgram = createProgram(gl, CANVAS_VS, DISPLAY_FS);
  const displayLocations = createLocations(gl, displayProgram, 
    ["position"], 
    ["fieldTexture", "prevField", "boundaries", "displayMode", "showBoundaries"]
  );
  gl.useProgram(displayProgram);
  gl.uniform1i(displayLocations.fieldTexture, 0);
  gl.uniform1i(displayLocations.prevField, 1);
  gl.uniform1i(displayLocations.boundaries, 2);

  // buffers
  const positionBuffer = makeBuffer(gl, new Float32Array([
    0, 0, 1, 0, 1, 1, 
    0, 0, 1, 1, 0, 1
  ]), gl.STATIC_DRAW);

  const imageToFieldVertexArray = makeVertexArray(gl, [[positionBuffer, imageToFieldLocations.position, 2, gl.FLOAT]]);
  const addSourceVertexArray = makeVertexArray(gl, [[positionBuffer, addSourceLocations.position, 2, gl.FLOAT]]);
  const diffuseVelocityVertexArray = makeVertexArray(gl, [[positionBuffer, diffuseVelocityLocations.position, 2, gl.FLOAT]]);
  const diffuseDensityVertexArray = makeVertexArray(gl, [[positionBuffer, diffuseDensityLocations.position, 2, gl.FLOAT]]);
  const advectVelocityVertexArray = makeVertexArray(gl, [[positionBuffer, advectVelocityLocations.position, 2, gl.FLOAT]]);
  const advectDensityVertexArray = makeVertexArray(gl, [[positionBuffer, advectDensityLocations.position, 2, gl.FLOAT]]);
  const calcDivFieldVertexArray = makeVertexArray(gl, [[positionBuffer, calcDivFieldLocations.position, 2, gl.FLOAT]]);
  const calcGradientFieldVertexArray = makeVertexArray(gl, [[positionBuffer, calcGradientFieldLocations.position, 2, gl.FLOAT]]);
  const calcMassConservingFieldVertexArray = makeVertexArray(gl, [[positionBuffer, calcMassConservingFieldLocations.position, 2, gl.FLOAT]]);
  const setBoundaryVelocityVertexArray = makeVertexArray(gl, [[positionBuffer, setBoundaryVelocityLocations.position, 2, gl.FLOAT]]);
  const setBoundaryDensityVertexArray = makeVertexArray(gl, [[positionBuffer, setBoundaryDensityLocations.position, 2, gl.FLOAT]]);
  const drawTextureVertexArray = makeVertexArray(gl, [[positionBuffer, drawTextureLocations.position, 2, gl.FLOAT]]);
  const displayVertexArray = makeVertexArray(gl, [[positionBuffer, displayLocations.position, 2, gl.FLOAT]]);

  //
  // functions
  //
  function imageToField(framebuffer, texture) {
    gl.useProgram(imageToFieldProgram);
    
    gl.bindVertexArray(imageToFieldVertexArray);
    bindTextureToLocation(gl, imageToFieldLocations.image, 0, texture);
    gl.uniform1f(imageToFieldLocations.scale, params.imageConvertScale);
    
    setFramebuffer(gl, framebuffer, textureWidth, textureHeight);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  imageToField(sourceTextureFramebuffer, sourceImage); // create source texture, use again in initialisation process

  function addSource() {
    gl.useProgram(addSourceProgram);
    
    gl.bindVertexArray(addSourceVertexArray);
    bindTextureToLocation(gl, addSourceLocations.fieldTexture, 0, fieldTextures[step % 2]);
    bindTextureToLocation(gl, addSourceLocations.sourceTexture, 1, sourceTexture);
    gl.uniform1f(addSourceLocations.deltaTime, params.deltaTime);
    // gl.uniform1i(addSourceLocations.inputMode, params.inputMode);
    gl.uniform1i(addSourceLocations.inputMode, 0);
    gl.uniform1f(addSourceLocations.splatDensity, params.splatDensity);
    gl.uniform1f(addSourceLocations.splatRadius, params.splatRadius);
    
    // let x = mouse.x / canvas.clientWidth * textureWidth;
    // let y = mouse.y / canvas.clientHeight * textureHeight;
    // let x0 = mouse.px / canvas.clientWidth * textureWidth;
    // let y0 = mouse.py / canvas.clientHeight * textureHeight;
    // gl.uniform2f(addSourceDataLocations.mousePos, x, y);
    // gl.uniform2f(addSourceDataLocations.mouseVel, (x - x0) / deltaTime, (y - y0) / deltaTime);
    gl.uniform2f(addSourceLocations.mousePos, 0, 0);
    gl.uniform2f(addSourceLocations.mouseVel, 0, 0);
    
    setFramebuffer(gl, fieldFramebuffers[(step + 1) % 2], textureWidth, textureHeight);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    step++;
  }

  function diffuseVelocity() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fieldFramebuffers[step % 2]);
    gl.bindTexture(gl.TEXTURE_2D, currentFieldTexture);
    gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 0, 0, textureWidth, textureHeight, 0);

    // iterate solve
    gl.useProgram(diffuseVelocityProgram);

    gl.bindVertexArray(diffuseVelocityVertexArray);
    bindTextureToLocation(gl, diffuseVelocityLocations.field0Texture, 0, currentFieldTexture);
    gl.uniform1f(diffuseVelocityLocations.diffusionRate, params.diffusionRate);
    gl.uniform1f(diffuseVelocityLocations.deltaTime, params.deltaTime);
    for (let i = 0; i < RELAXATION_STEPS; ++i) {
      gl.useProgram(diffuseVelocityProgram);
      bindTextureToLocation(gl, diffuseVelocityLocations.fieldTexture, 1, fieldTextures[step % 2]);
      
      setFramebuffer(gl, fieldFramebuffers[(step + 1) % 2], textureWidth, textureHeight);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      step++;
      
      setBoundaryVelocity();
    }
  }

  function diffuseDensity() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fieldFramebuffers[step % 2]);
    gl.bindTexture(gl.TEXTURE_2D, currentFieldTexture);
    gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 0, 0, textureWidth, textureHeight, 0);

    // iterate solve
    gl.useProgram(diffuseDensityProgram);
    
    gl.bindVertexArray(diffuseDensityVertexArray);
    bindTextureToLocation(gl, diffuseDensityLocations.field0Texture, 0, currentFieldTexture);
    gl.uniform1f(diffuseDensityLocations.diffusionRate, params.diffusionRate);
    gl.uniform1f(diffuseDensityLocations.deltaTime, params.deltaTime);
    for (let i = 0; i < RELAXATION_STEPS; ++i) {
      gl.useProgram(diffuseDensityProgram);
      bindTextureToLocation(gl, diffuseDensityLocations.fieldTexture, 1, fieldTextures[step % 2]);
      
      setFramebuffer(gl, fieldFramebuffers[(step + 1) % 2], textureWidth, textureHeight);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      step++;
      
      setBoundaryDensity();
    }
  }

  function advectVelocity() {
    gl.useProgram(advectVelocityProgram);

    gl.bindVertexArray(advectVelocityVertexArray);
    bindTextureToLocation(gl, advectVelocityLocations.fieldTexture, 0, fieldTextures[step % 2]);
    gl.uniform1f(advectVelocityLocations.deltaTime, params.deltaTime);

    setFramebuffer(gl, fieldFramebuffers[(step + 1) % 2], textureWidth, textureHeight);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    step++;

    setBoundaryVelocity();
  }

  function advectDensity() {
    gl.useProgram(advectDensityProgram);

    gl.bindVertexArray(advectDensityVertexArray);
    bindTextureToLocation(gl, advectDensityLocations.fieldTexture, 0, fieldTextures[step % 2]);
    gl.uniform1f(advectDensityLocations.deltaTime, params.deltaTime);

    setFramebuffer(gl, fieldFramebuffers[(step + 1) % 2], textureWidth, textureHeight);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    step++;

    setBoundaryDensity();
  }

  function project() {
    // calc div field
    gl.useProgram(calcDivFieldProgram);

    gl.bindVertexArray(calcDivFieldVertexArray);
    bindTextureToLocation(gl, calcDivFieldLocations.fieldTexture, 0, fieldTextures[step % 2]);

    setFramebuffer(gl, divFieldFramebuffer, textureWidth, textureHeight);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // calc gradient field
    gl.useProgram(calcGradientFieldProgram);

    gl.bindVertexArray(calcGradientFieldVertexArray);
    bindTextureToLocation(gl, calcGradientFieldLocations.divField, 1, divFieldTexture);
    gl.uniform1f(calcGradientFieldLocations.overRelaxation, params.overRelaxation);

    for (let i = 0; i < RELAXATION_STEPS; i++) {
      bindTextureToLocation(gl, calcGradientFieldLocations.gradientField, 0, gradientFieldTextures[i % 2]);
      
      setFramebuffer(gl, gradientFieldFramebuffers[(i + 1) % 2], textureWidth, textureHeight);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    // calc mass conserving field
    gl.useProgram(calcMassConservingFieldProgram);

    gl.bindVertexArray(calcMassConservingFieldVertexArray);
    bindTextureToLocation(gl, calcMassConservingFieldLocations.fieldTexture, 0, fieldTextures[step % 2]);
    bindTextureToLocation(gl, calcMassConservingFieldLocations.gradientField, 1, gradientFieldTextures[RELAXATION_STEPS % 2]);

    setFramebuffer(gl, fieldFramebuffers[(step + 1) % 2], textureWidth, textureHeight);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    step++;

    setBoundaryVelocity();
  }

  function setBoundaryVelocity() {
    gl.useProgram(setBoundaryVelocityProgram);

    gl.bindVertexArray(setBoundaryVelocityVertexArray);
    bindTextureToLocation(gl, setBoundaryVelocityLocations.boundaries, 0, boundariesTexture);
    bindTextureToLocation(gl, setBoundaryVelocityLocations.fieldTexture, 1, fieldTextures[step % 2]);
    gl.uniform1f(setBoundaryVelocityLocations.boundaryFriction, params.boundaryFriction);
  
    setFramebuffer(gl, fieldFramebuffers[(step + 1) % 2], textureWidth, textureHeight);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    step++;
  }

  function setBoundaryDensity(inputTexture, outputFramebuffer, boundaryType) {
    gl.useProgram(setBoundaryDensityProgram);

    gl.bindVertexArray(setBoundaryDensityVertexArray);
    bindTextureToLocation(gl, setBoundaryDensityLocations.boundaries, 0, boundariesTexture);
    bindTextureToLocation(gl, setBoundaryDensityLocations.fieldTexture, 0, fieldTextures[step % 2]);

    setFramebuffer(gl, fieldFramebuffers[(step + 1) % 2], textureWidth, textureHeight);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    step++;
  }

  function display(print = false) {
    gl.useProgram(displayProgram);

    gl.bindVertexArray(displayVertexArray);
    bindTextureToLocation(gl, displayLocations.fieldTexture, 0, fieldTextures[step % 2]);
    bindTextureToLocation(gl, displayLocations.prevField, 0, prevFieldTexture);
    bindTextureToLocation(gl, displayLocations.boundaries, 0, boundariesTexture);
    gl.uniform1i(displayLocations.displayMode, params.displayMode);
    gl.uniform1i(displayLocations.showBoundaries, params.showBoundaries);

    let width = canvas.width;
    let height = canvas.height;
    if (!print) {
      let clientAspect = canvas.width / canvas.height;
      let outputAspect = textureWidth / textureHeight;
      let correctionFactor = clientAspect / outputAspect;
      if (clientAspect < outputAspect) {
        height *= correctionFactor;
      } else {
        width /= correctionFactor;
      }
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport((canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function drawTexture(texture, clampField) {
    let width = canvas.width;
    let height = canvas.height;
    let clientAspect = canvas.width / canvas.height;
    let outputAspect = textureWidth / textureHeight;
    let correctionFactor = clientAspect / outputAspect;
    if (clientAspect < outputAspect) {
      height *= correctionFactor;
    } else {
      width /= correctionFactor;
    }

    gl.useProgram(drawTextureProgram);

    gl.bindVertexArray(drawTextureVertexArray);
    bindTextureToLocation(gl, drawTextureLocations.u_texture, 0, texture);
    gl.uniform1i(drawTextureLocations.clampField, clampField);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport((canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  let step = 0;
  function initialise() {
    step = 0;
    console.log("initialise()");
    canvas.width = gl.canvas.clientWidth;
    canvas.height = gl.canvas.clientHeight;
    imageToField(fieldFramebuffers[0], initialImage);
    // display();
    drawTexture(fieldTextures[step % 2], true);
  }
  initialise();

  function update() {
    console.log("update()");
    addSource();

    diffuseVelocity();
    project();
    advectVelocity();
    project();

    diffuseDensity();
    advectDensity();
  }
  
  // animation
  let play = false;
  let manualStep = 0;

  function loop() {
    if (!play) {
      console.log("paused");
      return;
    }

    update();
    drawTexture(fieldTextures[step % 2], true);

    requestAnimationFrame(loop);
  }

  // continuous animation

  function playPause() {
    play = !play;
    if (play) {
      requestAnimationFrame(loop);
    }
  }

  document.addEventListener('keydown', (event) => {
    switch(event.key) {
      case ' ':
        play = !play;
        if (play) {
          console.log("started");
          requestAnimationFrame(loop);
        }
        break;
      case 'r':
        play = false;
        manualStep = 0;
        initialise();
    }
  });

  document.addEventListener('mousemove', (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
    if (event.buttons != 0) {
      mouseInput = true;
    }
  });

  document.addEventListener('click', () => {
    steps[manualStep]();
    manualStep++;
    if (manualStep == steps.length) {
      manualStep = 0;
    }
  });
  

  const steps = [
    () => { 
      console.log("addSource()");
      addSource();
      drawTexture(fieldTextures[step % 2], true);
    },
    () => {
      console.log("diffuseVelocity()");
      diffuseVelocity();
      drawTexture(fieldTextures[step % 2], true);
    }, 
    () => {
      console.log("project()");
      project();
      // drawTexture(fieldTextures[step % 2], true);
      drawTexture(gradientFieldTextures[0], true);
    }, 
    () => {
      console.log("advectVelocity()");
      advectVelocity();
      drawTexture(fieldTextures[step % 2], true);
    }, 
    () => {
      console.log("project()");
      project();
      drawTexture(fieldTextures[step % 2], true);
    }, 
    () => {
      console.log("diffuseDensity()");
      diffuseDensity();
      drawTexture(fieldTextures[step % 2], true);
    }, 
    () => {
      console.log("advectDensity()");
      advectDensity();
      drawTexture(fieldTextures[step % 2], true);
    }
  ];
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
    "initial.png", 
    "source.png",
    "boundaries.png",
  ], render);
}

main();