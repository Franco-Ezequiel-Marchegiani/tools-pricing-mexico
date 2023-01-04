import  { GoogleSpreadsheet } from 'google-spreadsheet';
import axios from 'axios';

const exportSheet = async (googleID, credencialesSheet, title, data) =>{
    const documento = new GoogleSpreadsheet(googleID);
    await documento.useServiceAccountAuth(credencialesSheet);                
    await documento.loadInfo();

    const sheet = documento.sheetsByTitle[title];                                               //Selecciona la hoja a la cual plasmará el contenido, el valor se lo pasa por parámetro para no repetir
    await sheet.clearRows();                                                                    //Limpia las columnas                
    
    await sheet.addRows(data);                                                            //Añade la información del array                
};
const dateToday = ()=>{
    /* Horarios */
    let now         = new Date();
    let nowNumber   = now.getTime();
    let horas       = now.getHours();
    let minutos     = ("0" + now.getMinutes() ).slice(-2);                                      //Esto para que el formato de minuto sea "09" y no "9"
    let horaMinuto  = " " + horas + ":" + minutos;
    let dia         = ("0" + now.getDate()).slice(-2);                                          //Esto para que el formato de hora sea "09" y no "9"
    let anio        = now.getFullYear();
    let mes         = now.getMonth() + 1;
    let hora_hoy    = dia + "/" + mes + "/" + anio;
    let date        = hora_hoy + " " + horaMinuto;
    return {now, nowNumber, horas, minutos, horaMinuto, dia, anio, mes, hora_hoy, date,}
}

const llamadaAPI = async(methodType, url, head, params)=>{
    let apiCall = await axios({
            method: methodType,
            url: url,       //Se pasa por la url el número de offset actualizado, acorde a cada vuelta "https://api.mercadolibre.com/sites/MLA/search?seller_id=394109866"
            headers: head, 
            params: params
    }).catch(function (error) { 
        console.log("Nada por aquí mi loco");
    }); 
    return apiCall;
}
const exportSheetMKTShare = async (google_id,credencialesOrder, sheetTitle1, sheetTitle2, sheetTitle3, sheetTitle4, arrayData) =>{
    const documento = new GoogleSpreadsheet(google_id);
    await documento.useServiceAccountAuth(credencialesOrder);
    await documento.loadInfo();

    const app_VentasSheet =documento.sheetsByTitle[sheetTitle1];
    const r1Sheet =documento.sheetsByTitle[sheetTitle2];
    const forecastSheet =documento.sheetsByTitle[sheetTitle3];
    const consolidadoSheet =documento.sheetsByTitle[sheetTitle4];
    
    //Plasmamos info en el App_Ventas
    await app_VentasSheet.clearRows();
    await app_VentasSheet.addRows(arrayData);                                            //importa array de objetos en sheets

    /* Proceso Añadir Fecha a una sola celda */
    await r1Sheet.loadCells("A1");                                                          //Cargamos la celda a la que modificaremos
    const celdaR1 = r1Sheet.getCellByA1("A1");                                              //Obtenemos el rango de la celda a modificar, en este caso, solo el A1
    celdaR1.value = dateToday().date;                                                                     //Pisamos el valor y le colocamos el valor que nosotros queremos
    await r1Sheet.saveUpdatedCells();                                                       //Guardamos los cambios y los subimos al Sheet
    
    await forecastSheet.loadCells("A:B")                                                    //Cargamos la celda a la que modificaremos
    const celdaForecast = forecastSheet.getCellByA1("A1:B2");                               //Obtenemos el rango de la celda a modificar, en este caso, solo el A1
    celdaForecast.value = dateToday().date;                                                             //Pisamos el valor y le colocamos el valor que nosotros queremos
    await forecastSheet.saveUpdatedCells();                                                 //Guardamos los cambios y los subimos al Sheet
    
    await consolidadoSheet.loadCells("A2");                                                 //Cargamos la celda a la que modificaremos
    const celdaConsolidado = consolidadoSheet.getCellByA1("A2");                            //Obtenemos el rango de la celda a modificar, en este caso, solo el A1
    celdaConsolidado.value = dateToday().date;                                                          //Pisamos el valor y le colocamos el valor que nosotros queremos
    await consolidadoSheet.saveUpdatedCells();                                              //Guardamos los cambios y los subimos al Sheet
     
    console.log('***finalizando impotacion de COL del Mes anterior ***');
    console.log('***Proceso de COL del Mes anterior finalizado correctamente***');
}
//Exportamos un objeto, y adentro mencionamos las variables con funciones las cuales exportamos
export {exportSheet, dateToday, llamadaAPI, exportSheetMKTShare}