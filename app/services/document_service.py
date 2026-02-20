# app/services/document_service.py
"""
Serviço de geração automática de documentos.
Usa python-docx para preencher diretamente as tabelas do template do condomínio.
"""
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional, List
from docx import Document
import shutil
import io

from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


class DocumentService:
    """
    Serviço para geração de documentos a partir do template do condomínio.

    O template possui 3 tabelas:
    - Table 0: Dados do proprietário (FIXOS, já preenchidos no template)
    - Table 1: Dados do hóspede (5 rows x 6 cols)
    - Table 2: Acompanhantes (7 rows x 3 cols)

    E um parágrafo com Veículo/Modelo e Placa.
    """

    def __init__(self):
        """Inicializa o serviço de documentos"""
        self.template_dir = Path(settings.TEMPLATE_DIR)
        self.output_dir = Path(settings.OUTPUT_DIR)

        # Garantir que diretórios existem
        self.template_dir.mkdir(parents=True, exist_ok=True)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def _find_template(self) -> Optional[Path]:
        """
        Encontra o template do condomínio no diretório de templates.
        Procura pelo DEFAULT_TEMPLATE ou qualquer .docx no diretório.
        """
        # Tentar o template padrão configurado
        default_path = self.template_dir / settings.DEFAULT_TEMPLATE
        if default_path.exists():
            return default_path

        # Procurar qualquer .docx no diretório de templates
        docx_files = list(self.template_dir.glob("*.docx"))
        if docx_files:
            logger.info(f"Using template: {docx_files[0].name}")
            return docx_files[0]

        return None

    def _set_cell_text(self, table, row_idx: int, col_idx: int, text: str):
        """Define o texto de uma célula mantendo a formatação existente."""
        cell = table.rows[row_idx].cells[col_idx]
        # Limpar o conteúdo existente
        for paragraph in cell.paragraphs:
            for run in paragraph.runs:
                run.text = ""
        # Definir o novo texto no primeiro run ou criar um
        if cell.paragraphs and cell.paragraphs[0].runs:
            cell.paragraphs[0].runs[0].text = text
        elif cell.paragraphs:
            cell.paragraphs[0].text = text
        else:
            cell.text = text

    def generate_condo_authorization(
        self,
        booking_data: Dict[str, Any],
        property_data: Dict[str, Any],
        guest_data: Dict[str, Any],
        save_to_file: bool = True
    ) -> Dict[str, Any]:
        """
        Gera autorização de condomínio preenchendo o template real.

        Preenche:
        - Table 1 (hóspede): nome, CPF, endereço, telefone, bairro, celular,
          cidade, estado, entrada, saída, CEP
        - Table 2 (acompanhantes): nome e documento de cada acompanhante
        - Parágrafo de veículo/placa
        """
        try:
            template_path = self._find_template()

            if not template_path:
                logger.warning("No template found, creating default")
                template_path = self.template_dir / settings.DEFAULT_TEMPLATE
                self._create_default_template(template_path)

            # Copiar template para não modificar o original
            doc = Document(str(template_path))

            # Formatar datas
            check_in = booking_data.get('check_in')
            check_out = booking_data.get('check_out')

            if isinstance(check_in, str):
                check_in_formatted = datetime.fromisoformat(check_in).strftime('%d/%m/%Y')
            else:
                check_in_formatted = check_in.strftime('%d/%m/%Y') if check_in else ''

            if isinstance(check_out, str):
                check_out_formatted = datetime.fromisoformat(check_out).strftime('%d/%m/%Y')
            else:
                check_out_formatted = check_out.strftime('%d/%m/%Y') if check_out else ''

            # Verificar se o documento tem tabelas suficientes
            if len(doc.tables) >= 2:
                # ========== TABLE 1: Dados do Hóspede ==========
                guest_table = doc.tables[1]

                # Row 0: Hóspede / CPF
                self._set_cell_text(guest_table, 0, 1, guest_data.get('name', ''))
                self._set_cell_text(guest_table, 0, 5, guest_data.get('cpf', guest_data.get('document_number', '')))

                # Row 1: Endereço / Telefone
                self._set_cell_text(guest_table, 1, 1, guest_data.get('address', ''))
                self._set_cell_text(guest_table, 1, 5, guest_data.get('phone', ''))

                # Row 2: Bairro / Celular
                self._set_cell_text(guest_table, 2, 1, guest_data.get('bairro', ''))
                self._set_cell_text(guest_table, 2, 5, guest_data.get('celular', guest_data.get('phone', '')))

                # Row 3: Cidade / Estado
                self._set_cell_text(guest_table, 3, 1, guest_data.get('cidade', ''))
                self._set_cell_text(guest_table, 3, 5, guest_data.get('estado', ''))

                # Row 4: Entrada / Saída / CEP
                self._set_cell_text(guest_table, 4, 1, check_in_formatted)
                self._set_cell_text(guest_table, 4, 3, check_out_formatted)
                self._set_cell_text(guest_table, 4, 5, guest_data.get('cep', ''))

            # ========== TABLE 2: Acompanhantes ==========
            companions = guest_data.get('companions', []) or []
            if len(doc.tables) >= 3 and companions:
                comp_table = doc.tables[2]
                for i, companion in enumerate(companions[:5]):  # Máximo 5 acompanhantes
                    if i < len(comp_table.rows):
                        name = companion.get('name', '') if isinstance(companion, dict) else str(companion)
                        doc_num = companion.get('document', '') if isinstance(companion, dict) else ''
                        self._set_cell_text(comp_table, i, 1, name)
                        self._set_cell_text(comp_table, i, 2, doc_num)

            # ========== VEÍCULO/PLACA (Parágrafo) ==========
            vehicle = guest_data.get('vehicle', '')
            plate = guest_data.get('plate', '')
            if vehicle or plate:
                for para in doc.paragraphs:
                    if 'culo/Modelo' in para.text or 'Veículo' in para.text or 'culo' in para.text:
                        vehicle_text = f"Veículo/Modelo: {vehicle}"
                        plate_text = f"Placa: {plate}"
                        para.text = f"{vehicle_text}    {plate_text}"
                        break

            # ========== DATA (Parágrafo com Brasília/DF) ==========
            date_today = datetime.now().strftime('%d/%m/%Y')
            for para in doc.paragraphs:
                if 'lia/DF' in para.text or 'Brasília' in para.text or 'Bras' in para.text:
                    para.text = f"Brasília/DF, {date_today}"
                    break

            # Salvar ou retornar bytes
            if save_to_file:
                filename = self._generate_filename(guest_data.get('name', 'hospede'))
                file_path = self.output_dir / filename
                doc.save(str(file_path))

                logger.info(f"Document generated: {file_path}")

                return {
                    "success": True,
                    "file_path": str(file_path),
                    "filename": filename,
                    "message": "Documento gerado com sucesso"
                }
            else:
                doc_bytes = io.BytesIO()
                doc.save(doc_bytes)
                doc_bytes.seek(0)

                return {
                    "success": True,
                    "file_bytes": doc_bytes.getvalue(),
                    "filename": self._generate_filename(guest_data.get('name', 'hospede')),
                    "message": "Documento gerado com sucesso"
                }

        except Exception as e:
            logger.error(f"Error generating document: {e}")
            return {
                "success": False,
                "message": "Erro ao gerar documento. Verifique se o template existe e tente novamente."
            }

    def _generate_filename(self, guest_name: str) -> str:
        """
        Gera nome de arquivo único para o documento.
        Formato: autorizacao_NOME_DDMMYYYY_HHMMSS.docx
        """
        clean_name = "".join(c for c in guest_name if c.isalnum() or c.isspace())
        clean_name = clean_name.replace(' ', '_')[:30]
        timestamp = datetime.now().strftime('%d%m%Y_%H%M%S')
        return f"autorizacao_{clean_name}_{timestamp}.docx"

    def _create_default_template(self, template_path: Path):
        """
        Cria um template padrão simples caso nenhum seja encontrado.
        """
        doc = Document()
        doc.add_heading('AUTORIZAÇÃO DE HOSPEDAGEM', 0)
        doc.add_paragraph('Template padrão - substitua pelo template real do condomínio.')

        # Criar tabela de hóspede (5x6)
        table = doc.add_table(rows=5, cols=6)
        table.style = 'Table Grid'
        labels = [
            ['Hóspede:', '', '', '', 'CPF:', ''],
            ['Endereço:', '', '', '', 'Telefone:', ''],
            ['Bairro:', '', '', '', 'Celular:', ''],
            ['Cidade:', '', '', '', 'Estado:', ''],
            ['Entrada:', '', 'Saída:', '', 'CEP:', ''],
        ]
        for ri, row_data in enumerate(labels):
            for ci, text in enumerate(row_data):
                table.rows[ri].cells[ci].text = text

        doc.save(str(template_path))
        logger.info(f"Default template created: {template_path}")

    def list_generated_documents(self, limit: int = 50, offset: int = 0) -> list[Dict[str, Any]]:
        """Lista os documentos gerados, com suporte a paginação por offset."""
        documents = []

        all_files = sorted(
            self.output_dir.glob("*.docx"),
            key=lambda p: p.stat().st_mtime,
            reverse=True
        )

        for file_path in all_files[offset : offset + limit]:
            stat = file_path.stat()
            documents.append({
                "filename": file_path.name,
                "path": str(file_path),
                "size_kb": round(stat.st_size / 1024, 2),
                "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
            })

        return documents

    def get_document_path(self, filename: str) -> Optional[Path]:
        """Retorna o caminho completo de um documento gerado."""
        file_path = self.output_dir / filename
        return file_path if file_path.exists() else None

    def delete_document(self, filename: str) -> bool:
        """Deleta um documento gerado."""
        try:
            file_path = self.output_dir / filename
            if file_path.exists():
                file_path.unlink()
                logger.info(f"Document deleted: {filename}")
                return True
            return False
        except Exception as e:
            logger.error(f"Error deleting document: {e}")
            return False
