/** 开发板的独立编辑图层形状。 */
export interface LayerTransform {
  readonly scaleX: number;
  readonly scaleY: number;
  readonly tx: number;
  readonly ty: number;
}

export interface LayerBackdrop {
  readonly image: string;
  readonly pixelWidth: number;
  readonly pixelHeight: number;
}

export interface MapLayer {
  readonly id: string;
  readonly name?: string;
  readonly backdrop?: LayerBackdrop;
  readonly transform?: LayerTransform;
}
