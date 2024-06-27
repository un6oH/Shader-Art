const VSTexture = `#version 300 es
precision highp float;

in vec2 clipSpace;

out vec2 position; // coordinates in texCoords

void main() {
  gl_Position = vec4(clipSpace, 0, 1);

  position = (clipSpace + 1.0) * 0.5;
}
`;

const VSDiffuse = `#version 300 es
precision highp float;

in vec2 pixel; // pixel coordinates

uniform vec2 textureDimensions;

out vec2 position; // coordinates in texCoords
out vec2 position_l; // coordinates of left pixel in texCoords
out vec2 position_r; // coordinates of right pixel in texCoords
out vec2 position_t; // coordinates of top pixel in texCoords
out vec2 position_b; // coordinates of bottom pixel in texCoords

void main() {
  vec2 px = 1.0 / textureDimensions; // size of one pixel in texture space

  vec2 normCoords = pixel / textureDimensions;
  vec2 clipSpace = (normCoords * 2.0 + vec2(-1)) * vec2(1, -1);
  gl_Position = vec4(clipSpace, 0, 1);

  position = normCoords;
  position_l = normCoords + vec2(-px.x, 0);
  position_r = normCoords + vec2(px.x, 0);
  position_t = normCoords + vec2(0, px.y);
  position_b = normCoords + vec2(0, -px.y);
}
`;

const VSApplyForce = `#version 300 es
precision highp float;

in vec2 position; // position in pixel coords

uniform vec2 textureDimensions;
uniform float splatRadius;

void main() {
  gl_Position = vec4((position / textureDimensions * 2.0 + vec2(-1)) * vec2(1, -1), 0, 1);
  gl_PointSize = splatRadius * 2.0;
}
`;

const VSSetBoundaries = `#version 300 es
precision highp float;

in vec2 position; // position in texture space
in vec2 normal; // normal vector of boundary surface

uniform vec2 textureDimensions;

out vec2 texCoords;
out vec2 v_normal;

void main() {
  vec2 normCoords = position / textureDimensions;
  vec2 clipSpace = (normCoords * 2.0 + vec2(-1)) * vec2(1, -1);
  gl_Position = vec4(clipSpace, 0, 1);

  texCoords = normCoords;
  v_normal = normal;
}
`;