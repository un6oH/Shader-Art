const CANVAS_VS = 
`#version 300 es

in vec2 position; // texture coordinates 

out vec2 v_texCoord; // texture coordinates

void main() {
  vec2 clipSpace = position * 2.0 - 1.0;
  gl_Position = vec4(clipSpace, 0, 1);

  v_texCoord = position;
}
`;

const TEXTURE_2D_VS = 
`#version 300 es

in vec2 position; // pixel coordinates

uniform vec2 textureSize;

out vec2 v_texCoord; // pixel coordinates

void main() {
  vec2 normCoords = position / textureSize;
  vec2 clipSpace = normCoords * 2.0 - 1.0;
  gl_Position = vec4(clipSpace, 0, 1);

  v_texCoord = position;
}
`;

const TEXTURE_3D_VS = 
`#version 300 es

in vec2 position // pixel coordinates

uniform vec2 textureDimensions;
uniform int layer;
uniform sampler2D waterTexture;
uniform sampler2D heightMap;
uniform sampler3D sedimentTexture

out int v_layer;
out vec2 v_position;
out bool update;

void main() {
  vec2 normCoords = position / textureDimensions;
  vec2 clipSpace = normCoords * 2.0 + 1.0;
  gl_Position = vec4(clipSpace, 0, 1);

  int height = 

  v_position = position;
  v_layer = layer;
}
`

const DIFFUSION_VS = 
`#version 300 es

in vec2 position; // pixel coordinates

uniform vec2 textureSize;
 
// pixel coordinates
out vec2 v_texCoord;
out vec2 v_texCoord_l;
out vec2 v_texCoord_r;
out vec2 v_texCoord_t;
out vec2 v_texCoord_b;

void main() {
  vec2 normCoords = position / textureSize;
  vec2 clipSpace = normCoords * 2.0 - 1.0;
  gl_Position = vec4(clipSpace, 0, 1);

  v_texCoord = position;
  v_texCoord_l = position + vec2(-1,  0);
  v_texCoord_r = position + vec2( 1,  0);
  v_texCoord_t = position + vec2( 0,  1);
  v_texCoord_b = position + vec2( 0, -1);
}
`;

const UPDATE_PARTICLES = 
`#version 300 es

in vec3 position; // pixel coords
in vec3 velocity;
in int size;

uniform vec4 diameters;

out vec3 newPosition; // pixel coords
out vec3 newVelocity;
out int 


`

const DRAW_PARTICLES = 
`#version 300 es

in vec2 position; // pixel coordinates

uniform vec2 textureSize;

void main() {
  vec2 normCoords = position / textureSize;
  vec2 clipSpace = normCoords * 2.0 - 1.0;
  gl_Position = vec4(clipSpace, 0, 1);

  gl_PointSize = 1.0;
}
`