const FSSetBoundaries = `#version 300 es
precision highp float;

in vec2 v_normal;

layout(location = 0) out float boundary;
layout(location = 1) out vec2 normal;

void main() {
  boundary = 1.0;
  normal = v_normal;
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
  float p = texture(pressureField, position).x;
  pressure = p < 0.0 ? max(p, -0.5) : min(p, 0.5);
}
`;

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


const FSDiffuse = `#version 300 es
precision highp float;

in vec2 position; // coordinates in texCoords
in vec2 position_l; // coordinates of left pixel in texCoords
in vec2 position_r; // coordinates of right pixel in texCoords
in vec2 position_t; // coordinates of top pixel in texCoords
in vec2 position_b; // coordinates of bottom pixel in texCoords

uniform sampler2D velocityResult; // Solution matrix * field = result
uniform sampler2D velocityField; // RG32F texture
uniform sampler2D boundaryBoolean; // R8 texture
uniform sampler2D boundaryNormal; // RG32F texture
uniform float deltaTime;
uniform vec2 dx; // simulation domain * dx = texture domain

out vec2 velocity;

void main() {
  if (texture(boundaryBoolean, position).x == 1.0) {
    vec2 normal = texture(boundaryNormal, position).xy;
    velocity = -texture(velocityField, position + normal).xy;
    return;
  }

  vec2 c = texture(velocityField, position).xy;
  vec2 l = texture(velocityField, position_l).xy;
  vec2 r = texture(velocityField, position_r).xy;
  vec2 t = texture(velocityField, position_t).xy;
  vec2 b = texture(velocityField, position_b).xy;
  vec2 result = texture(velocityResult, position).xy;

  vec2 alpha = c * c / deltaTime;
  vec2 rBeta = 1.0 / (4.0 + alpha);
  velocity = (l + r + t + b + alpha * result) * rBeta;
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
// halfrdx = 1/dx * 0.5
uniform vec2 dx; 

out float divergence;

void main() {
  // velocities of adjacent cells
  vec2 l = texture(velocityField, position_l).xy;
  vec2 r = texture(velocityField, position_r).xy;
  vec2 t = texture(velocityField, position_t).xy;
  vec2 b = texture(velocityField, position_b).xy;

  divergence = (r.x - l.x) * 0.5 / dx.x + (t.y - b.y) * 0.5 / dx.y;
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
uniform sampler2D boundaryBoolean;
uniform sampler2D boundaryNormal;

out float pressure;

void main() {
  float c = texture(pressureField, position).x;
  float l = texture(pressureField, position_l).x;
  float r = texture(pressureField, position_r).x;
  float t = texture(pressureField, position_t).x;
  float b = texture(pressureField, position_b).x;
  float result = texture(divergenceResult, position).x;

  // float alpha = -(c * c);
  float alpha = 1.0;
  float rBeta = 1.0 / 4.0001;

  float p;

  if (texture(boundaryBoolean, position).x == 1.0) {
    vec2 normal = texture(boundaryNormal, position).xy;
    p = texture(pressureField, position + normal).x;
  } else {
    p = (l + r + t + b + alpha * result) * rBeta;
  }

  pressure = p;
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
  // velocity = vec2(0.5) / dx * vec2(r - l, t - b);
}
`;

const FSDisplayTexture = `#version 300 es
precision highp float;

in vec2 position; // texture coords

uniform sampler2D velocityField;
uniform sampler2D pressureField;
uniform sampler2D boundaryBoolean;
uniform sampler2D divergenceResult;
uniform sampler2D gradientField;
uniform sampler2D boundaryNormal;
uniform vec2 simulationDimensions;
uniform int mode;

out vec4 colour;

void main() {
  vec4 c = vec4(0, 0, 0.5, 1);
  switch(mode) {
    case 0:
      vec2 v = texture(velocityField, position).xy * simulationDimensions / 5.0;
      c.xy = 1.0 / (1.0 + exp(-v));
      // c.xy = sqrt(abs(1.0 / (1.0 + exp(-v)))) * sign(v);
      break;
    case 1: 
      // c.xyz = vec3(abs(texture(pressureField, position).x)) * 100.0;
      c.xyz = vec3(1.0 / (1.0 + exp(-texture(pressureField, position).x)));
      break;
    case 2: 
      c.xyz = vec3(1.0 / (1.0 + exp(-texture(divergenceResult, position).x)));
      break;
    case 3:
      vec2 g = texture(gradientField, position).xy;
      c.xy = 1.0 / (1.0 + exp(-g));
      break;
    case 4:
      vec2 n = texture(boundaryNormal, position).xy * 64.0;
      c.xy = 1.0 / (1.0 + exp(-n));
      break;
  }
  if (texture(boundaryBoolean, position).x == 1.0 && mode != 4) {
    c.xyz = vec3(0.0);
  }
  colour = c;
}
`;