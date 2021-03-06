import React, { Component } from 'react';
import Media from 'react-media';

import ModuleTabs from 'modules/market/components/common/module-tabs/module-tabs';
import ModulePane from 'modules/market/components/common/module-tabs/module-pane';
import MarketOutcomesChart from 'modules/market-charts/containers/market-outcomes-chart';
import { TEMP_TABLET } from 'modules/common/constants';

import { Candlestick } from 'modules/market-charts/components/market-outcome-charts--candlestick/candlestick';
import MarketDepth from 'modules/market-charts/containers/market-outcome-chart-depth';
import { BigNumber } from 'bignumber.js';
import { MarketData } from 'modules/types';

interface MarketChartsPaneProps {
  currentTimestamp?: number | undefined;
  marketId: string;
  maxPrice: BigNumber;
  minPrice: BigNumber;
  selectedOutcomeId: number;
  updateSelectedOrderProperties: Function;
  daysPassed?: number;
  preview?: Boolean;
  market?: MarketData;
  toggle: Function;
}

interface MarketChartsPaneState {
  hoveredPrice: null | BigNumber;
  hoveredDepth: Array<any>;
}

export default class MarketChartsPane extends Component<
  MarketChartsPaneProps,
  MarketChartsPaneState
> {
  static defaultProps = {
    currentTimestamp: 0,
    daysPassed: 0,
  };

  constructor(props) {
    super(props);

    this.state = {
      hoveredDepth: [],
      hoveredPrice: null,
    };
    this.updateHoveredPrice = this.updateHoveredPrice.bind(this);
    this.updateHoveredDepth = this.updateHoveredDepth.bind(this);
  }

  updateHoveredDepth(hoveredDepth) {
    this.setState({
      hoveredDepth,
    });
  }

  updateHoveredPrice(hoveredPrice) {
    this.setState({
      hoveredPrice,
    });
  }

  render() {
    const {
      currentTimestamp,
      marketId,
      selectedOutcomeId,
      maxPrice,
      minPrice,
      updateSelectedOrderProperties,
      daysPassed,
      preview,
      market,
      toggle,
    } = this.props;
    const { hoveredPrice, hoveredDepth } = this.state;
    const shared = { marketId, selectedOutcomeId };

    return (
      <Media query={TEMP_TABLET}>
        {matches =>
          matches ? (
            <ModuleTabs selected={preview ? 2 : 0} fillForMobile>
              <ModulePane label="Candlesticks">
                {!preview && (
                  <Candlestick
                    {...shared}
                    currentTimeInSeconds={currentTimestamp}
                    minPrice={minPrice}
                    maxPrice={maxPrice}
                    daysPassed={daysPassed}
                    isMobile
                  />
                )}
              </ModulePane>
              <ModulePane label="Market Depth">
                <MarketDepth
                  {...shared}
                  updateSelectedOrderProperties={updateSelectedOrderProperties}
                  hoveredPrice={hoveredPrice}
                  hoveredDepth={hoveredDepth}
                  updateHoveredDepth={this.updateHoveredDepth}
                  updateHoveredPrice={this.updateHoveredPrice}
                  market={preview && market}
                  initialLiquidity={preview}
                />
              </ModulePane>
            </ModuleTabs>
          ) : (
            <ModuleTabs selected={preview ? 2 : 0} showToggle toggle={toggle}>
              <ModulePane label="Price History">
                {!preview && (
                  <MarketOutcomesChart
                    {...shared}
                  />
                )}
              </ModulePane>
              <ModulePane label="Candlesticks">
                {!preview && (
                  <Candlestick
                    {...shared}
                    currentTimeInSeconds={currentTimestamp}
                    minPrice={minPrice}
                    maxPrice={maxPrice}
                    daysPassed={daysPassed}
                  />
                )}
              </ModulePane>
              <ModulePane label="Market Depth">
                <MarketDepth
                  {...shared}
                  updateSelectedOrderProperties={updateSelectedOrderProperties}
                  hoveredPrice={hoveredPrice}
                  hoveredDepth={hoveredDepth}
                  updateHoveredDepth={this.updateHoveredDepth}
                  updateHoveredPrice={this.updateHoveredPrice}
                  market={preview && market}
                  initialLiquidity={preview}
                />
              </ModulePane>
            </ModuleTabs>
          )
        }
      </Media>
    );
  }
}
