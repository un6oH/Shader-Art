const UPDATE_POSITION_VS = `#version 300 es

in vec2 velocity;
in vec2 position;

uniform sampler2D displacementAoiTexture; // TEXTURE0
uniform sampler2D velocityAoiTexture; // TEXTURE1
uniform sampler2D positionAoiTexture; // TEXTURE2
uniform float deltaTime;
uniform float maxAcc;
uniform float minSpeed;
uniform float maxSpeed;
uniform float separationF;
uniform float alignmentF;
uniform float cohesionF;
uniform bool mouseActive;
uniform float mouseAvoidanceF;
uniform vec2 mousePos;
uniform float aoiRadius;
uniform vec2 canvasDimensions; // constant

out vec2 newVelocity;
out vec2 newPosition;

vec2 euclideanModulo(vec2 n, vec2 m) {
  return mod(mod(n, m) + m, m);
}

void main() {
  vec2 texCoord = position / canvasDimensions;

  vec3 displacementData = texture(displacementAoiTexture, texCoord).xyz;
  float boidsInRadius = displacementData.z - 1.0;
  if (boidsInRadius < 1.0) {
    newVelocity = velocity;
    newPosition = position + velocity * deltaTime;
    return;
  }
  vec3 velocityData = texture(velocityAoiTexture, texCoord).xyz;
  vec3 positionData = texture(positionAoiTexture, texCoord).xyz;

  vec2 separationVector = displacementData.xy * aoiRadius / boidsInRadius;

  vec2 avgVelocity = (velocityData.xy - velocity) / boidsInRadius;
  vec2 alignmentVector = avgVelocity;
  
  vec2 avgPosition = (positionData.xy - position) / boidsInRadius;
  vec2 cohesionVector = avgPosition - position;

  vec2 targetVelocity = separationVector * separationF + alignmentVector * alignmentF + cohesionVector * cohesionF;

  // mouse avoidance
  if (mouseActive) {
    vec2 mouseDisplacement = mousePos - position;
    float distanceToMouse = length(mouseDisplacement);
    if (distanceToMouse > aoiRadius) {
      return;
    }
    vec2 mouseAvoidanceVector = mouseDisplacement - normalize(mouseDisplacement) * aoiRadius;
    targetVelocity += mouseAvoidanceVector * mouseAvoidanceF;
  }

  vec2 acc = targetVelocity - velocity;
  float accMag = length(acc);
  if (accMag > maxAcc) {
    acc *= maxAcc / accMag;
  }
  newVelocity = velocity + (acc) * deltaTime;
  float speed = length(newVelocity);
  if (speed < minSpeed) {
    newVelocity *= minSpeed / speed;
  }
  if (speed > maxSpeed) {
    newVelocity *= maxSpeed / speed;
  }
  
  newPosition = euclideanModulo(position + newVelocity * deltaTime, canvasDimensions);
}
`;
 
const DRAW_DISPLACEMENT_AOI_VS = `#version 300 es

in vec2 vertex;

uniform int detail;
uniform vec2 canvasDimensions; // constant

out vec2 displacement;

void main() {
  vec2 normCoords = vertex / canvasDimensions;
  vec2 clipSpace = normCoords * 2.0 - 1.0;
  gl_Position = vec4(clipSpace, 0, 1);

  int d = detail * 3;
  int vertexId = gl_VertexID % (detail * 3);
  int sector = int(float(vertexId) / 3.0);
  int point = vertexId % 3;
  float sectorAngle = 6.28318530718 / float(detail);
  float angle;

  if (point == 0) {
    displacement = vec2(0, 0);
  } else {
    float sectorAngle = 6.28318530718 / float(detail);
    float angle = float(sector) * sectorAngle + (point == 1 ? 0.0 : sectorAngle);
    displacement = vec2(cos(angle), sin(angle));
  }
}
`;

const DRAW_VELOCITY_AOI_VS = `#version 300 es

in vec2 vertex;

uniform vec2 canvasDimensions; // constant

void main() {
  vec2 normCoords = vertex / canvasDimensions;
  vec2 clipSpace = normCoords * 2.0 - 1.0;
  gl_Position = vec4(clipSpace, 0, 1);
}
`;
 
const DRAW_POSITION_AOI_VS = `#version 300 es

in vec2 vertex;

uniform vec2 canvasDimensions; // constant

void main() {
  vec2 normCoords = vertex / canvasDimensions;
  vec2 clipSpace = normCoords * 2.0 - 1.0;
  gl_Position = vec4(clipSpace, 0, 1);
}
`;



const DRAW_BOIDS_VS = `#version 300 es

in vec2 position;
in vec3 colour;

uniform vec2 canvasDimensions; // constant

out vec3 v_colour;

void main() {
  vec2 normCoords = position / canvasDimensions;
  vec2 clipSpace = normCoords * 2.0 - 1.0;
  gl_Position = vec4(clipSpace, 0, 1);
  v_colour = colour;
  gl_PointSize = 10.0;
}
`;

const DRAW_TEXTURE_VS = `#version 300 es

uniform vec2 canvasDimensions;

void main() {
  gl_Position = vec4(0, 0, 0, 1);
  gl_PointSize = canvasDimensions.x * 2.0;
}
`