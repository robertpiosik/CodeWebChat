import { Configurations } from './Configurations'

export default {
  component: Configurations
}

// const configurations: Configurations.Configuration[] = [
//   {
//     model: 'flash-2.5',
//     provider: 'Gemini' ,
//   },
//   {
//     model: 'pro-2.5',
//     provider: 'Gemini' ,
//   },
// ]

// export const Multiple = () => {
//   return (
//     <Configurations
//       configurations={configurations}
//       on_configuration_click={(name) => {
//         console.log('on_preset_click', name)
//       }}
//       is_disabled={false}
//       selected_Configurations={[]}
//       on_preset_delete={(name) => console.log('on_preset_delete', name)}
//       on_preset_edit={(name) => console.log('on_preset_edit', name)}
//       on_preset_duplicate={(name) => console.log('on_preset_duplicate', name)}
//       on_manage_configurations={() => console.log('on_create_preset')}
//       on_preset_copy={(name) => console.log('on_preset_copy', name)}
//       on_Configurations_reorder={(reordered) =>
//         console.log('on_Configurations_reorder', reordered)
//       }
//       on_set_default_Configurations={() => console.log('on_set_default')}
//     />
//   )
// }

// export const CodeCompletionsMode = () => {
//   return (
//     <Configurations
//       Configurations={Configurations}
//       on_configuration_click={(name) => {
//         console.log('on_preset_click', name)
//       }}
//       is_disabled={false}
//       selected_Configurations={[]}
//       on_preset_delete={(name) => console.log('on_preset_delete', name)}
//       on_preset_edit={(name) => console.log('on_preset_edit', name)}
//       on_preset_duplicate={(name) => console.log('on_preset_duplicate', name)}
//       on_manage_configurations={() => console.log('on_create_preset')}
//       on_preset_copy={(name) => console.log('on_preset_copy', name)}
//       on_Configurations_reorder={(reordered) =>
//         console.log('on_Configurations_reorder', reordered)
//       }
//       on_set_default_Configurations={() => console.log('on_set_default')}
//     />
//   )
// }
