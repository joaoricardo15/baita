import type { CSSProperties } from 'react'

import Button from './button'
import CheckBox from './checkBox'
import CodeInput from './codeInput'
import Error from './error'
import Highlight from './highlight'
import InstallCard from './installCard'
import Loading from './loading'
import Logo from './logo'
import OptionsInput from './optionsInput'
import Skeleton from './skeleton'
import StatusChip from './statusChip'
import Text from './text'
import TextInput from './textInput'
import TransformPanel from './transformPanel'
import VariableInput from './variableInput'

export interface ComponentProps {
  className?: string
  style?: CSSProperties
}

export {
  Button,
  CheckBox,
  CodeInput,
  Error,
  Highlight,
  InstallCard,
  Loading,
  Logo,
  OptionsInput,
  Skeleton,
  StatusChip,
  Text,
  TextInput,
  TransformPanel,
  VariableInput,
}
