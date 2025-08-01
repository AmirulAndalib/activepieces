import { createAction, Property } from '@activepieces/pieces-framework';
import { httpClient, HttpMethod } from '@activepieces/pieces-common';
import { talkableAuth } from '../../..';

export const createEventsBatch = createAction({
  name: 'create_events_batch', // Must be a unique across the piece, this shouldn't be changed.
  auth: talkableAuth,
  displayName: 'Create batch of events',
  description: 'Create batch of events in Talkable',
  props: {
    create_offers: Property.Checkbox({
      displayName: 'Create offers',
      description: 'Create offers for campaign',
      required: false,
      defaultValue: false,
    }),
    events: Property.Json({
      displayName: 'Events',
      description: undefined,
      required: false,
      defaultValue: [
        {
          email: 'user@store.com',
          event_category: 'newsletter_subscription',
          event_number: '42',
          subtotal: 100.44,
          first_name: 'John',
          last_name: 'Doe',
          username: 'johndoe1992',
          customer_id: '1024',
          custom_properties: {
            country: 'US',
            eye_color: 'brown',
            person_occupation: 'marketing',
          },
          custom_field: '',
          phone_number: '+12025551111',
          campaign_tags: 'post-purchase',
          sharing_channels: ['facebook', 'custom'],
          ip_address: '192.0.2.255',
          uuid: '123e4567-e89b-32d1-a456-426614174000',
          created_at: '2023-04-27T11:30:42.769-07:00',
          traffic_source: 'in-store',
          coupon_codes: ['C0001', 'C0002'],
          currency_iso_code: 'USD',
          shipping_address:
            '456 White Finch St., North Augusta, South Carolina, 29860, United States',
          shipping_zip: '29860',
          items: [
            {
              price: 100.44,
              quantity: 1,
              product_id: 'SUBSCRIPTION',
            },
          ],
        },
      ],
    }),
  },
  async run(context) {
    const TALKABLE_API_URL = 'https://www.talkable.com/api/v2';
    const { site, api_key } = context.auth;
    const createEventsBatch = await httpClient
      .sendRequest<string[]>({
        method: HttpMethod.POST,
        url: `${TALKABLE_API_URL}/origins/batch/events`,
        headers: {
          Authorization: `Bearer ${api_key}`,
          'Content-Type': 'application/json',
        },
        body: {
          site_slug: site,
          data: context.propsValue.events,
          create_offers: context.propsValue.create_offers,
        },
      });
    return createEventsBatch.body;
  },
});
