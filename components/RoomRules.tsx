export const ROOM_RULES = [
  '연습실은 다같이 이용하는 공간이므로 깨끗한 뒷정리 부탁드립니다(원상복구)',
  '개인짐은 개인사물함 안에 두고 다녀야 합니다.',
  '앰프나 보면대 등은 사용 후 제자리에 두어야 합니다.',
  '5분 이상 방을 비워선 안되며 사용하지 않을 시 즉시 예약 취소를 해주세요',
  '방을 선점하기 위해 등원전 미리 예약하는 것을 금지합니다',
  '방 사용 후 개인방 소등, 에어컨 점검을 꼭 해주세요(별관)',
  '연습실을 예약한 사람 외에는 출입을 금합니다. (외부인/2인1실 금지)',
]

export function RoomRulesList({ dark = false }: { dark?: boolean }) {
  const textColor = dark ? 'rgba(255,255,255,0.55)' : '#6b6b9a'
  const numColor = dark ? '#818cf8' : '#6366f1'
  return (
    <ol style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: 0, padding: 0, listStyle: 'none', textAlign: 'left' }}>
      {ROOM_RULES.map((rule, i) => (
        <li key={i} style={{ display: 'flex', gap: 8, fontSize: 13, lineHeight: 1.6, color: textColor }}>
          <span style={{ fontWeight: 800, color: numColor, flexShrink: 0 }}>{i + 1}.</span>
          <span>{rule}</span>
        </li>
      ))}
    </ol>
  )
}
