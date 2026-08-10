# 🍕 Controle de Motoboys — Pizzaria

Sistema web simples para registrar despachadas de motoboys durante o turno 15:00 → 02:00.

## Tecnologias

- HTML
- CSS
- JavaScript
- localStorage do navegador

## Como usar

Abra `index.html` no navegador ou publique os arquivos em qualquer hospedagem estática, incluindo Vercel.

### Configuração inicial

Abra o sistema e clique em **⚙️ Configurações** para:

- adicionar/remover motoboys;
- alterar nomes;
- cadastrar bairros;
- alterar o valor por pedido de cada bairro.

Os valores que vêm no exemplo são apenas demonstrativos.

## Fluxo

1. Escolha o motoboy.
2. Adicione um ou mais bairros.
3. Informe quantos pedidos foram para cada bairro.
4. O sistema calcula automaticamente o valor.
5. Adicione observação, se necessário.
6. Clique em **Despachar motoboy**.
7. A rota fica amarela como **aguardando retorno**.
8. Quando o motoboy voltar, clique em **Confirmar retorno**.
9. O valor passa a contar no total dele e na barra visual.

## Importante sobre Vercel

Esta versão usa `localStorage`. Portanto, os dados ficam salvos **somente no navegador/dispositivo que está usando o sistema**.

Isso é ótimo para uma primeira versão rápida em um único computador da pizzaria.

Se vários celulares/computadores precisarem acessar o mesmo painel simultaneamente, será necessário trocar o armazenamento por um banco/API, como Supabase, Firebase ou uma API própria.

## Turno

O sistema considera:

- início: 15:00
- término: 02:00 do dia seguinte

O registro é associado automaticamente ao "dia do turno". Por exemplo, registros feitos às 01:30 pertencem ao turno iniciado no dia anterior.

O botão **Encerrar / limpar dia** apaga os registros do turno atual, mas mantém os cadastros de motoboys e bairros.

## Publicar na Vercel

1. Crie um repositório no GitHub.
2. Envie os arquivos deste projeto.
3. Na Vercel, importe o repositório.
4. Não precisa configurar framework.
5. Deploy.

A Vercel pode hospedar estes arquivos como site estático.
