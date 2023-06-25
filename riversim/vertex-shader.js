const CANVAS_VS = 
`#version 300 es
precision highp float;

in vec2 position; // canvas coordinates

uniform vec2 canvasDimensions;

out vec2 texCoord;

void main() {
  vec2 normCoords = position / canvasDimensions;
  vec2 clipSpace = normCoords * 2.0 - 1.0;
  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);

  texCoord = normCoords;
}
`

const TEXTURE_VS = 
`#version 300 es
precision highp float;

in vec2 position; // pixel coordinates

uniform vec2 textureDimensions;

out vec2 v_texCoord;

void main() {
  vec2 normCoords = position / textureDimensions;
  vec2 clipSpace = normCoords * 2.0 - 1.0;
  gl_Position = vec4(clipSpace, 0, 1);

  v_texCoord = position;
}
`

const EDGE_DETECT_X_VS = 
`#version 300 es

in float leftEdge;
in float y;
in bool depthIsPositive;


out float rightEdge;
out bool outDepthIsPositive;

void main() {
  vec2 onePixel = 1.0 / textureDimensions;

  float h = 0.0;
  float b = 0.0;
  float d = 0.0;
  
  for (float x = 0.0; x < 1.0; x += onePixel.x) {
    if (x < leftEdge) continue;
    
    h = texture(heightTexture, vec2(x, y)).x;
    b = texture(groundHeightTexture, vec2(x, y)).x;
    d = h - b;
    if (depthIsPositive != d > 0.0) {
      rightEdge = x;
      outDepthIsPositive = !depthIsPositive;
      break;
    }
    rightEdge = 1.0;
  }
}
`;

const EDGE_DETECT_Y_VS = 
`#version 300 es

void main() {
  while (!edge) {
    
  }
}
`;

const CORRECT_VOLUME_VS = 
`#version 300 es

in vec2 leftEdge;
in vec2 rightEdge;
in bool depthIsPositive;

uniform sampler2D heightTexture;
uniform sampler2D heightn1Texture;
uniform sampler2D groundHeightTexture;
uniform vec2 textureDimensions;

out vec2 newLeftEdge;
out vec2 v_texCoord;
flat out float excess;

void main() {
  newLeftEdge = rightEdge;
  if (!depthIsPositive) {

    break;
  }

  vec2 onePixel = 1.0 / textureDimensions;

  float volume = 0.0;
  float volumen1 = 0.0;
  
  for (float x = 0.0; x < 1.0; x += onePixel.x) {
    
    if (x > edge1.x) { break; }
    
    volume += 
  }
}
`;
