import {Entity, model, property} from '@loopback/repository';

@model({settings: {strict: false}})
export class TravelPreferenceTypes extends Entity {
  @property({
    type: 'string',
  })
  name?: string;

  @property({
    type: 'string',
  })
  image?: string;

  @property({
    type: 'array',
    itemType:'string'
  })
  categories?: Array<string>;

  @property({
    type: 'boolean',
    default: false,
  })
  selected: boolean;

  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  id: string;

  // Define well-known properties here

  // Indexer property to allow additional data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [prop: string]: any;

  constructor(data?: Partial<TravelPreferenceTypes>) {
    super(data);
  }
}

export interface TravelPreferenceTypesRelations {
  // describe navigational properties here
}

export type TravelPreferenceTypesWithRelations = TravelPreferenceTypes &
  TravelPreferenceTypesRelations;
