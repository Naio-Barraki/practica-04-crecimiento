// Gradiente de color verde y nervadura central estilizada de la hoja.
uniform vec3 uLeafColor;
varying vec2 vUv;
varying vec3 vNormal;
varying float vHeight;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 lightDirection = normalize(vec3(-0.4, 0.8, 0.5));
  float diffuse = 0.48 + 0.52 * max(dot(normal, lightDirection), 0.0);
  float heightGradient = smoothstep(-1.0, 1.0, vHeight);
  float centralVein = 1.0 - smoothstep(0.0, 0.035, abs(vUv.x - 0.5));
  vec3 leafColor = uLeafColor * mix(0.72, 1.14, heightGradient) * diffuse;
  leafColor += centralVein * 0.055;
  gl_FragColor = vec4(leafColor, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
