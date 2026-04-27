'use client'
import { useState } from 'react'

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: number
  onChange: (value: number) => void
}

export function NumericInput({ value, onChange, ...rest }: Props) {
  const [str, setStr] = useState(value === 0 ? '' : String(value))

  return (
    <input
      {...rest}
      type="number"
      value={str}
      onChange={ev => {
        setStr(ev.target.value)
        onChange(ev.target.value === '' ? 0 : +ev.target.value)
      }}
      onWheel={ev => ev.currentTarget.blur()}
    />
  )
}
