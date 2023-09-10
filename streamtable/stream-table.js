function render(images) {
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

  const initialSedimentHeightImage = images[0];
  const IOSourceImage = images[1];

  //
  // programs
  //


  const simulation = {};

  const sedimentTexture = gl.createTexture();
  const sedimentHeightTexture = gl.createTexture();
  const suspendedSedimentTexture = gl.createTexture();

  const sedimentFramebuffer = gl.createFramebuffer();

  function setSimulation() {
    // simulation parameters
    simulation.sedimentTextureSize = [256, 256];
    simulation.sedimentTextureDepth = 64;

    // sediment transport
    simulation.sedimentDensity = 1600;
    simulation.waterDensity = 1000;
    simulation.gravitationalAcceleration = 9.81;
    simulation.waterViscosity = 0.00089;
    simulation.vonKarmanConstant = 0.407;
    simulation.grainDiameters = [0.0018, 0.0014, 0.0010, 0.0005]; // grain diameters in metres
    simulation.sedimentComposition = [0.225, 0.45, 0.225, 0.1]; // percentage volume

    simulation.voxelSize = 0.01; // size of each pixel in metres
    simulation.voxelVolume = simulation.voxelSize ** 3;

    // fluid sim
    simulation.diffusionRate = 1; 
    simulation.overRelaxation = 0; 
    simulation.matrixSolverSteps = 20; 
    
    simulation.sedimentColours = [
      [1, 0, 0, 1], 
      [0, 1, 0, 1], 
      [0, 0, 1, 1],
      [1, 1, 1, 1]
    ];
    simulation.waterColour = [1, 0.5, 0.5, 0.1];

    // set up textures and framebuffers
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, sedimentTexture);
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 0, gl.RGBA32F, ...simulation.sedimentTextureSize, simulation.sedimentTextureDepth);

    gl.bindTexture(gl.TEXTURE_2D, sedimentHeightTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, ...simulation.sedimentTextureSize, 0, gl.RED, gl.FLOAT, initialSedimentHeightImage);

    gl.bindTexture(gl.TEXTURE_2D, suspendedSedimentTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, ...simulation.sedimentTextureSize, 0, gl.RGBA, gl.FLOAT, null);

    gl.bindFramebuffer(gl.FRAMEBUFFER, sedimentFramebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, sedimentHeightTexture, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT2, gl.TEXTURE_2D, suspendedSedimentTexture, 0);

    // set sediment texture
    gl.useProgram(initialiseSedimentProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, sedimentFramebuffer);
    gl.bindVertexArray(initialiseSedimentVertexArray);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sedimentHeightTexture);

    for (let layer = 0; layer < simulation.sedimentTextureDepth; layer++) {
      gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, sedimentTexture, 0, layer);
      gl.clearBufferiv(gl.COLOR, 0, new Float32Array(simulation.sedimentComposition));

      gl.uniform1i(initialiseSedimentLocations.layer, layer);
      
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  }

  setSimulation();

  function waterStep() {

  }

  function sedimentStep() {
    // erosion
    gl.useProgram(sedimentErosionProgram);

    gl.bindFramebuffer(gl.FRAMEBUFFER, sedimentFramebuffer);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, current.waterTexture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, current.sedimentTexture);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, current.suspendedSedimentTexture)



    // sediment transport
    gl.useProgram(sedimentTransportProgram);

    // deposition
    gl.useProgram(sedimentDepositionProgram);

    let particlePositionLayers = new Array(simulation.sedimentTextureSize[2]);
    particleLayers.fill([]);
    simulation.particles.forEach

    
  }


}




// load images
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
    // insert images to load
    "initialsedimentheight.png"
  ], render);
}

main();