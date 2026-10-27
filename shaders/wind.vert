// Desplazamiento de vértices para simular el balanceo de las hojas.
uniform float uTime;
uniform float uWindStrength;
uniform float uPhase;
varying vec2 vUv;
varying vec3 vNormal;
varying float vHeight;

void main() {
  vec3 displaced = position;
  float tipInfluence = smoothstep(-0.25, 0.85, position.y);
  float sway = sin(uTime * 2.0 + position.y * 3.5 + position.x * 2.0 + uPhase);
  displaced.x += sway * uWindStrength * 0.16 * tipInfluence;
  displaced.z += cos(uTime * 1.45 + position.x * 3.2 + uPhase) * uWindStrength * 0.07 * tipInfluence;
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vHeight = position.y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
