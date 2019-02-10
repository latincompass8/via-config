// @flow
import React, {Component} from 'react';
import {Key} from './Key';
import {KeyOverlay} from './key-overlay';
import {Title} from './title-bar';
import styles from './keyboard.css';
import {getKeyboardFromDevice, getLayoutFromDevice} from '../utils/device-meta';
import type {LightingData} from './Home';
import type {Result} from '../utils/kle-parser';
import type {Device} from '../utils/device-meta';
import {MatrixLayout} from '../utils/layout-parser';
import {BrightnessControl} from './brightness-control';
import {LayerControl} from './LayerControl';
import {
  getLabelForByte,
  isAlpha,
  isNumericSymbol,
  isNumericOrShiftedSymbol
} from '../utils/key';
import {THEMES} from '../utils/themes';
import {OVERRIDE_DETECT} from '../utils/override';

type Color = {
  c: string,
  t: string
};

type Props = {
  activeLayer: number | null,
  detected: boolean,
  connected: boolean,
  loaded: boolean,
  lightingData: LightingData | null,
  selectedKey: number | null,
  selectedKeyboard: Device | null,
  selectedTitle: string | null,
  matrixKeycodes?: number[],
  showCarouselButtons: boolean,
  clearSelectedKey: (arg: any) => void,
  updateSelectedKey: (val: number) => void,
  updateBrightness: (val: number) => void,
  updateLayer: (val: number) => void,
  prevKeyboard: () => Promise<void>,
  nextKeyboard: () => Promise<void>
};

export class Keyboard extends Component<Props> {
  overlay: KeyOverlay | null;
  chooseKey(
    {c, t, label: kleLabel, size, marginX, marginY}: Result,
    idx: number,
    useMatrixKeycodes: boolean,
    colorMap: {[color: string]: string},
    theme?: $Values<typeof THEMES> = THEMES.PBT_HEAVY_INDUSTRY
  ) {
    const {matrixKeycodes = [], selectedKey, updateSelectedKey} = this.props;
    const themeKey = colorMap[`${c}:${t}`] || 'alphas';
    const themeColors = theme[themeKey];
    const key = `${idx}`;
    const onClick = evt => {
      evt.stopPropagation();
      updateSelectedKey(idx);
    };
    ({c, t} = themeColors);

    let label = kleLabel;
    if (useMatrixKeycodes) {
      const byte = matrixKeycodes[idx];
      label = byte ? getLabelForByte(byte, size) : '';
    }

    const partialProps = {
      key,
      size,
      c,
      t,
      indent: marginX,
      marginTop: marginY,
      selected: selectedKey === idx,
      onClick
    };

    if (isAlpha(label) || isNumericOrShiftedSymbol(label)) {
      return label && <Key {...partialProps} label={label.toUpperCase()} />;
    } else if (isNumericSymbol(label)) {
      const topLabel = label[0];
      const bottomLabel = label[label.length - 1];
      return (
        bottomLabel && (
          <Key
            {...partialProps}
            topLabel={topLabel}
            bottomLabel={bottomLabel}
          />
        )
      );
    } else {
      return <Key {...partialProps} label={label} centerLabel />;
    }
  }

  // We want to show the default layout from KLE if
  // we can't read the matrix for some reason i.e
  // overriding displaying unconnected devices
  useMatrixKeycodes() {
    const device = this.getDevice();
    return !!(device && device.path);
  }

  getDevice(): Device | null {
    const {selectedKeyboard} = this.props;
    return selectedKeyboard;
  }

  render() {
    const {
      activeLayer,
      lightingData,
      selectedKey,
      selectedKeyboard,
      selectedTitle,
      connected,
      detected,
      clearSelectedKey,
      updateLayer,
      loaded,
      updateBrightness,
      matrixKeycodes = []
    } = this.props;
    const device = this.getDevice();
    if (device) {
      const keyboard = getKeyboardFromDevice(device);
      const {res: selectedLayout, colorMap} = getLayoutFromDevice(device);
      const matrixLayout = MatrixLayout[keyboard.name].layout;
      const showLayer = selectedTitle === Title.KEYS;
      const showBrightness = selectedTitle === Title.LIGHTING;
      const useMatrixKeycodes = this.useMatrixKeycodes();
      const clickable = loaded && showLayer;
      let keyCounter = 0;
      return (
        <div onClick={clearSelectedKey} className={styles.keyboardContainer}>
          <div
            className={[
              styles.keyboard,
              connected && styles.connected,
              clickable && styles.clickable,
              loaded && styles.loaded,
              (detected || OVERRIDE_DETECT) && styles.detected
            ].join(' ')}
          >
            {selectedLayout.map((arr, row) => (
              <div key={row} className={styles.row}>
                {arr.map((key, column) => {
                  const parsedLabelIndex = Number.parseInt(key.label);
                  const idx =
                    keyboard.overrideMatrixIndexing && !isNaN(parsedLabelIndex)
                      ? parsedLabelIndex
                      : keyCounter++;
                  return this.chooseKey(key, idx, useMatrixKeycodes, colorMap);
                })}
              </div>
            ))}
          </div>
          <div
            onClick={this.props.prevKeyboard}
            className={[
              styles.prevButton,
              this.props.showCarouselButtons && styles.activeButton
            ].join(' ')}
          />
          <div
            onClick={this.props.nextKeyboard}
            className={[
              styles.nextButton,
              this.props.showCarouselButtons && styles.activeButton
            ].join(' ')}
          />
          <LayerControl
            loaded={loaded}
            showLayer={showLayer}
            updateLayer={updateLayer}
            activeLayer={activeLayer}
          />
          <KeyOverlay
            ref={overlay => (this.overlay = overlay)}
            device={device}
            matrixLayout={matrixLayout}
            matrixKeycodes={matrixKeycodes}
            useMatrixKeycodes={this.useMatrixKeycodes()}
            selectedKey={selectedKey}
          />
          {lightingData && (
            <BrightnessControl
              brightness={lightingData.brightness}
              updateBrightness={updateBrightness}
              showControl={showBrightness}
            />
          )}
        </div>
      );
    }
    return (
      <div className={styles.keyboardContainer}>
        <div className={[styles.keyboard].join(' ')} />
      </div>
    );
  }
}
