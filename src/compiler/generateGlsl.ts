import { Texture2D } from 'regl';
import { TransformApplication } from '../GlslSource';
import { formatArguments } from './formatArguments';
import { contains } from './contains';
import { shaderString } from './shaderString';
import { ShaderParams } from './compileGlsl';

export type GlslGenerator = (uv: string) => string;

export function generateGlsl(
  transformApplications: TransformApplication[],
  shaderParams: ShaderParams,
): GlslGenerator {
  let fragColor: GlslGenerator = () => '';

  transformApplications.forEach((transformApplication) => {
    let f1: (
      uv: string,
    ) =>
      | string
      | number
      | number[]
      | ((context: any, props: any) => number | number[])
      | Texture2D
      | undefined;

    const typedArgs = formatArguments(
      transformApplication,
      shaderParams.uniforms.length,
    );

    typedArgs.forEach((typedArg) => {
      if (typedArg.isUniform) {
        shaderParams.uniforms.push(typedArg);
      }
    });

    // add new glsl function to running list of functions
    if (!contains(transformApplication, shaderParams.transformApplications)) {
      shaderParams.transformApplications.push(transformApplication);
    }

    // current function for generating frag color shader code
    const f0 = fragColor;
    if (transformApplication.transform.type === 'src') {
      fragColor = (uv) =>
        `${shaderString(
          uv,
          transformApplication.transform.name,
          typedArgs,
          shaderParams,
        )}`;
    } else if (transformApplication.transform.type === 'coord') {
      fragColor = (uv) =>
        `${f0(
          `${shaderString(
            uv,
            transformApplication.transform.name,
            typedArgs,
            shaderParams,
          )}`,
        )}`;
    } else if (transformApplication.transform.type === 'color') {
      fragColor = (uv) =>
        `${shaderString(
          `${f0(uv)}`,
          transformApplication.transform.name,
          typedArgs,
          shaderParams,
        )}`;
    } else if (transformApplication.transform.type === 'combine') {
      // combining two generated shader strings (i.e. for blend, mult, add funtions)
      f1 =
        typedArgs[0].value && typedArgs[0].value.transforms
          ? (uv: string) =>
              `${generateGlsl(typedArgs[0].value.transforms, shaderParams)(uv)}`
          : typedArgs[0].isUniform
          ? () => typedArgs[0].name
          : () => typedArgs[0].value;
      fragColor = (uv) =>
        `${shaderString(
          `${f0(uv)}, ${f1(uv)}`,
          transformApplication.transform.name,
          typedArgs.slice(1),
          shaderParams,
        )}`;
    } else if (transformApplication.transform.type === 'combineCoord') {
      // combining two generated shader strings (i.e. for modulate functions)
      f1 =
        typedArgs[0].value && typedArgs[0].value.transforms
          ? (uv: string) =>
              `${generateGlsl(typedArgs[0].value.transforms, shaderParams)(uv)}`
          : typedArgs[0].isUniform
          ? () => typedArgs[0].name
          : () => typedArgs[0].value;
      fragColor = (uv) =>
        `${f0(
          `${shaderString(
            `${uv}, ${f1(uv)}`,
            transformApplication.transform.name,
            typedArgs.slice(1),
            shaderParams,
          )}`,
        )}`;
    }
  });
  return fragColor;
}