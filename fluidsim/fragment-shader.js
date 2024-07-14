const FSAdvect = `#version 300 es
precision highp float;

in vec2 position; // coordinates in texCoords

uniform sampler2D velocityField; // RG32F texture
uniform float deltaTime;
uniform vec2 dx; // simulation domain * dx = texture domain | texture domain * rdx = simulation domain

out vec2 velocity;

void main() {
  vec2 v0 = texture(velocityField, position).xy; // velocity of fragment
  vec2 samplePosition = position - v0 * deltaTime * dx;

  velocity = texture(velocityField, samplePosition).xy;
}
`;

const FSCopyVelocity = `#version 300 es
precision highp float;

in vec2 position; // texCoords

uniform sampler2D velocityField;

out vec2 velocity;

void main() {
  velocity = texture(velocityField, position).xy;
}
`;

const FSCopyPressure = `#version 300 es
precision highp float;

in vec2 position; // texCoords

uniform sampler2D pressureField;

out float pressure;

void main() {
  pressure = texture(pressureField, position).x;
}
`;

const FSDiffuse = `#version 300 es
precision highp float;

in vec2 position; // coordinates in texCoords
in vec2 position_l; // coordinates of left pixel in texCoords
in vec2 position_r; // coordinates of right pixel in texCoords
in vec2 position_t; // coordinates of top pixel in texCoords
in vec2 position_b; // coordinates of bottom pixel in texCoords

uniform sampler2D velocityResult; // Solution matrix * field = result
uniform sampler2D velocityField; // RG32F texture
uniform float deltaTime;
uniform vec2 dx; // simulation domain * dx = texture domain

out vec2 velocity;

void main() {
  vec2 c = texture(velocityField, position).xy;
  vec2 l = texture(velocityField, position_l).xy;
  vec2 r = texture(velocityField, position_r).xy;
  vec2 t = texture(velocityField, position_t).xy;
  vec2 b = texture(velocityField, position_b).xy;
  vec2 result = texture(velocityResult, position).xy;

  vec2 alpha = c * c / deltaTime;
  vec2 rBeta = 1.0 / (4.0 + alpha);
  vec2 new = (l + r + t + b + alpha * result) * rBeta;

  velocity = new.xy;
}
`;

// called in a point primitive
const FSApplyForce = `#version 300 es
precision highp float;

uniform vec2 inputVelocity;
uniform float deltaTime;
uniform float splatRadius;

out vec2 velocity; // output is blended

void main() {
  velocity = inputVelocity * deltaTime * max((1.0 - length(gl_PointCoord.xy - 0.5) * 2.0), 0.0);
}
`;

const FSDivergenceCalc = `#version 300 es
precision highp float;

in vec2 position; // coordinates in texCoords
in vec2 position_l; // coordinates of left pixel in texCoords
in vec2 position_r; // coordinates of right pixel in texCoords
in vec2 position_t; // coordinates of top pixel in texCoords
in vec2 position_b; // coordinates of bottom pixel in texCoords

uniform sampler2D velocityField;
// simulation domain * dx = texture domain 
// texture domain * rdx = simulation domain
// halfrdx = 1/dx * 0.5 = 1/2dx
uniform vec2 dx; 

out float divergence;

void main() {
  // velocities of adjacent cells
  vec2 l = texture(velocityField, position_l).xy;
  vec2 r = texture(velocityField, position_r).xy;
  vec2 t = texture(velocityField, position_t).xy;
  vec2 b = texture(velocityField, position_b).xy;

  divergence = 0.5 / ((r.x - l.x) * dx.x + (t.y - b.y) * dx.y);
}
`;

const FSSolvePressure = `#version 300 es
precision highp float;

in vec2 position; // coordinates in texCoords
in vec2 position_l; // coordinates of left pixel in texCoords
in vec2 position_r; // coordinates of right pixel in texCoords
in vec2 position_t; // coordinates of top pixel in texCoords
in vec2 position_b; // coordinates of bottom pixel in texCoords

uniform sampler2D divergenceResult; // Solution matrix * field = result
uniform sampler2D pressureField; // R32F texture

out float pressure;

void main() {
  float c = texture(pressureField, position).x;
  float l = texture(pressureField, position_l).x;
  float r = texture(pressureField, position_r).x;
  float t = texture(pressureField, position_t).x;
  float b = texture(pressureField, position_b).x;
  float result = texture(divergenceResult, position).x;

  float alpha = -(c * c);
  float rBeta = 0.25;
  float pressure = (l + r + t + b + alpha * result) * rBeta;
}
`;

const FSGradientSubtract = `#version 300 es
precision highp float;

in vec2 position; // coordinates in texCoords
in vec2 position_l; // coordinates of left pixel in texCoords
in vec2 position_r; // coordinates of right pixel in texCoords
in vec2 position_t; // coordinates of top pixel in texCoords
in vec2 position_b; // coordinates of bottom pixel in texCoords

uniform sampler2D velocityField;
uniform sampler2D pressureField;
uniform vec2 dx;

out vec2 velocity;

void main() {
  float l = texture(pressureField, position_l).x;
  float r = texture(pressureField, position_r).x;
  float t = texture(pressureField, position_t).x;
  float b = texture(pressureField, position_b).x;

  vec2 v = texture(velocityField, position).xy;
  velocity = v - vec2(0.5) / dx * vec2(r - l, t - b);
}
`;

const FSSetBoundariesVelocity = `#version 300 es
precision highp float;

in vec2 texCoords; // position in texture coords
in vec2 v_normal; // normalised vector

uniform sampler2D velocityField;
uniform float px; // length of pixel in texture space

out vec2 velocity;

void main() {
  vec2 v = texture(velocityField, texCoords + v_normal * px).xy;
  velocity = -v;
}
`;

const FSSetBoundariesPressure = `#version 300 es
precision highp float;

in vec2 texCoords; // position in texture coords
in vec2 v_normal; // normalised vector

uniform sampler2D pressureField;
uniform float px; // length of pixel in texture space

out float pressure;

void main() {
  float p = texture(pressureField, texCoords + v_normal * px).x;
  pressure = p;
}
`;

const FSDisplayTexture = `#version 300 es
precision highp float;

in vec2 position; // texture coords

uniform sampler2D velocityField;
uniform sampler2D pressureField;
uniform int mode;

out vec4 colour;

void main() {
  vec4 c = vec4(0, 0, 0, 1);
  switch(mode) {
    case 0:
      c.xy = texture(velocityField, position).xy;
      break;
    case 1: 
      c.x = texture(pressureField, position).x;
      break;
    case 2: 
      c.xy = texture(velocityField, position).xy;
      c.z = 0.5;
      break;
  }
  colour = c;
}
`;