# Créditos das imagens

Toda fotografia do site precisa ter autor, origem e licença registrados aqui. Nenhuma imagem pode ser gerada por IA.

## Em uso

Duas fotos de banco de imagens, provisórias até a ON-STYLE ter fotos próprias. Nenhuma mostra pessoas nem marca legível.

| Arquivo (`public/fotos/`) | Onde aparece      | Autor                                              | Página original                                                                    | Licença                                          | Conferida em |
| ------------------------- | ----------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------ | ------------ |
| `cadeira-junto-a-porta-*` | Contato           | [Ten](https://unsplash.com/@tensees)               | <https://unsplash.com/photos/4y50IXfnaIo>                                          | [Unsplash License](https://unsplash.com/license) | 08/10/2026   |
| `cadeira-em-sala-clara-*` | Serviços e preços | [Caio Coelho](https://unsplash.com/@smokthebikini) | <https://unsplash.com/photos/black-leather-barber-chair-in-white-room-OOKPHqAICKA> | [Unsplash License](https://unsplash.com/license) | 08/10/2026   |

A Unsplash License permite uso comercial, sem pedir autorização e sem exigir crédito na página. O crédito fica registrado aqui mesmo assim.

A imagem de compartilhamento (`public/compartilhar.jpg`, 1200 por 630, usada quando o endereço do site é enviado por WhatsApp ou redes sociais) é um recorte da foto `cadeira-em-sala-clara-*`, de Caio Coelho, com a mesma licença.

Cada foto foi recortada em 3:2 e salva em WebP nas larguras de 640, 960 e 1440 pixels. O recorte da segunda tira do quadro um frasco com rótulo que aparecia no canto da foto original.

## Histórico

O protótipo trazia três fotos que vieram do projeto original do Lovable, sem autor nem licença informados. Elas mostravam marcas de terceiros e foram retiradas do site na Fase 1, antes de o repositório ficar público. **Continuam no histórico do git**, nos commits anteriores a essa retirada. Se a licença delas não puder ser confirmada, o histórico precisa ser reescrito para apagá-las; isso é uma decisão sua, porque reescrever histórico já enviado tem custo.

## Ícone do painel

O ícone do painel (`public/icones/icone.svg` e os PNGs gerados a partir dele) não é foto: é um desenho vetorial simples, feito em código, que reproduz o "ON" aceso da marca (letras pretas sobre o laranja `#ff7a1a`, fundo `#131416`). É **provisório**, até haver arte final da marca. Os PNGs (192, 512 e 180 pixels) foram gerados com o Chrome a partir do SVG; para refazer, abra o SVG numa página do tamanho desejado e tire a captura.

## Fotos de serviços e produtos

Não ficam no repositório nem entram nesta lista: o dono as envia pelo painel (Serviços e Produtos), e elas vão para o Storage do Supabase. Usar foto própria ou com licença que permita uso comercial é responsabilidade de quem envia, e o cadastro lembra disso.

## Como adicionar uma foto

1. Use foto própria ou de um banco com licença que permita uso comercial (Unsplash, Pexels).
2. Registre aqui: arquivo, onde aparece, autor com link da página original, licença e a data em que foi conferida.
3. Salve em `public/fotos/` com um nome que descreva a cena, nas três larguras: `<nome>-640.webp`, `<nome>-960.webp` e `<nome>-1440.webp`, em 3:2.
4. Mostre a foto com o componente `Foto` (`src/components/foto.tsx`) e escreva um texto alternativo que descreva a cena para quem não vê a imagem.

O teste `creditos-das-fotos` falha se houver arquivo em `public/fotos/` sem registro nesta página.
