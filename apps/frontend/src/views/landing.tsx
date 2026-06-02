import {
  ListAlt as ListAltIcon,
  SmartToyOutlined as SmartToyOutlinedIcon,
} from '@mui/icons-material'
import { FC, useContext, useState } from 'react'
import { Link } from 'react-router-dom'
import { TypeAnimation } from 'react-type-animation'

import { Logo, Text } from '@/components'
import { AuthContext } from '@/providers/auth'
import { LINKS } from '@/router'
import { getLabels, Labels } from '@/utils/labels'

const LandingPage: FC = () => {
  const { isLoading } = useContext(AuthContext)

  const [animationDone, setAnimationDone] = useState(false)

  return (
    <div
      className="d-flex flex-column justify-content-between"
      style={{ minHeight: '80vh' }}
    >
      <div>
        <div className="d-flex justify-content-center mt-4">
          <Logo size={150} />
        </div>
        {!isLoading && (
          <div className="text-center m-4">
            <TypeAnimation
              wrapper="div"
              cursor={false}
              className="fs-1 text-secondary fw-bolder"
              sequence={[
                labels.earlyAdopters,
                500,
                labels.greetings,
                () => setAnimationDone(true),
              ]}
            />
            {animationDone && (
              <div className="mt-5">
                <div className="mt-4">
                  <Text
                    className="d-flex align-items-center text-start mx-2"
                    icon={<ListAltIcon color="secondary" />}
                  >
                    {labels.step1}
                  </Text>
                </div>
                <div className="mt-4">
                  <Text
                    className="d-flex align-items-center text-start mx-2"
                    icon={<SmartToyOutlinedIcon color="secondary" />}
                  >
                    {labels.step2}
                  </Text>
                </div>
                <div className="w-100 text-center mt-5">
                  <TypeAnimation
                    cursor={false}
                    className="fs-1 text-secondary fw-bolder"
                    sequence={[5000, labels.enjoy]}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="text-center pb-3">
        <p className="text-secondary mx-3 mb-2">{labels.purpose}</p>
        <Link to={LINKS.privacy} className="text-secondary mx-2">
          {labels.privacy}
        </Link>
        <Link to={LINKS.terms} className="text-secondary mx-2">
          {labels.terms}
        </Link>
      </div>
    </div>
  )
}

export default LandingPage

const LABELS: Labels = {
  en: {
    purpose:
      'Baita is a personal automation platform that helps you manage tasks, connect your favorite services, and create bots to automate your daily workflows.',
    earlyAdopters: '\n\nThanks for being an early adopter 🥳',
    greetings: 'This is how it works:',
    step1:
      'Create to do tasks and see them at "To Do" page. You can also set bots to help you with that 😉.',
    step2: 'Create bots to make your life easier.',
    enjoy: 'Enjoy 🎉🎉🎉',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
  },
  pt: {
    purpose:
      'Baita é uma plataforma de automação pessoal que ajuda você a gerenciar tarefas, conectar seus serviços favoritos e criar robôs para automatizar seu dia a dia.',
    earlyAdopters: '\n\nMuito obrigado por testar nosso produto 🥳',
    greetings: 'É assim que funciona:',
    step1:
      'Crie tarefas e as veja na tela "To Do". Você também pode configurar um robô para te ajudar 😉.',
    step2: 'Crie robôs para facilitar a sua vida.',
    enjoy: 'Aproveite 🎉🎉🎉',
    privacy: 'Política de Privacidade',
    terms: 'Termos de Serviço',
  },
}

const labels = getLabels(LABELS)
